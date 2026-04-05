import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, type RepairAnalysisPayload, type RepairRequestMatch, type RepairRequestPayload } from "../../lib/api/client";

const requestSchema = z.object({
  category: z.string().min(1, "Choose a repair category"),
  itemName: z.string().min(3, "Enter the item name or model"),
  description: z.string().min(12, "Describe the problem in more detail"),
  urgency: z.enum(["standard", "urgent", "flexible"]),
  pickupPreference: z.enum(["dropoff", "pickup", "onsite"]),
  preferredDate: z.string().optional(),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;
type UploadedPreview = {
  name: string;
  size: number;
  url: string;
};

function parseNumber(value: string | number) {
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function formatCurrency(value: string | number) {
  return `A$${new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseNumber(value))}`;
}

function formatUploadFallback(fileName: string) {
  return `https://local.repairhub.dev/uploads/${encodeURIComponent(fileName)}`;
}

async function uploadPhotos(files: File[]) {
  if (!files.length) {
    return {
      photoUrls: [] as string[],
      notice: null as string | null,
    };
  }

  try {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signedUpload = await api.getSignedUpload({
      timestamp,
      folder: "repairhub",
    });

    if (!signedUpload.cloud_name || !signedUpload.api_key) {
      return {
        photoUrls: files.map((file) => formatUploadFallback(file.name)),
        notice: "Cloudinary is not configured locally, so photos were stored as local placeholders and the analysis used your written description.",
      };
    }

    const { cloud_name: cloudName, api_key: apiKey } = signedUpload;

    const photoUrls = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", apiKey);
        formData.append("timestamp", signedUpload.params.timestamp);
        formData.append("folder", signedUpload.params.folder);
        formData.append("signature", signedUpload.signature);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Photo upload failed.");
        }

        const payload = (await response.json()) as { secure_url: string };
        return payload.secure_url;
      }),
    );

    return {
      photoUrls,
      notice: null as string | null,
    };
  } catch {
    return {
      photoUrls: files.map((file) => formatUploadFallback(file.name)),
      notice: "Photo upload was unavailable in this environment, so RepairHub analyzed your request using the description and category details.",
    };
  }
}

export function RequestWizard() {
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<UploadedPreview[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [sortBy, setSortBy] = useState("best");
  const [analysis, setAnalysis] = useState<RepairAnalysisPayload | null>(null);
  const [repairRequest, setRepairRequest] = useState<RepairRequestPayload | null>(null);
  const [matches, setMatches] = useState<RepairRequestMatch[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
  const [isRefreshingSelection, setIsRefreshingSelection] = useState(false);
  const deferredSortBy = useDeferredValue(sortBy);
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      category: "",
      itemName: "",
      description: "",
      urgency: "standard",
      pickupPreference: "dropoff",
      preferredDate: "",
      notes: "",
    },
  });

  const dropzone = useDropzone({
    onDrop: (files) => setUploadedFiles(files),
  });

  useEffect(() => {
    const nextPreviews = uploadedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      url:
        typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(file)
          : formatUploadFallback(file.name),
    }));
    setUploadedPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((preview) => {
        if (preview.url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [uploadedFiles]);

  const sortedMatches = useMemo(() => {
    if (deferredSortBy === "price") {
      return [...matches].sort((left, right) => parseNumber(left.quote_amount) - parseNumber(right.quote_amount));
    }

    if (deferredSortBy === "distance") {
      return [...matches].sort((left, right) => parseNumber(left.distance_km) - parseNumber(right.distance_km));
    }

    return [...matches].sort((left, right) => parseNumber(right.score) - parseNumber(left.score));
  }, [deferredSortBy, matches]);

  const selectedMatch = sortedMatches.find((match) => match.id === selectedMatchId) ?? sortedMatches[0] ?? null;
  const selectionStatus = repairRequest?.selection_status ?? "none";
  const selectedRepairerName = repairRequest?.selected_repairer_name ?? selectedMatch?.repairer_name ?? "No repairer selected";
  const selectionStatusLabel =
    selectionStatus === "pending"
      ? "Pending repairer review"
      : selectionStatus === "approved"
        ? "Approved by repairer"
        : selectionStatus === "rejected"
          ? "Rejected by repairer"
          : "Awaiting customer request";

  const onAnalyze = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setUploadNotice(null);
    setAnalysis(null);
    setRepairRequest(null);
    setMatches([]);
    setSelectedMatchId("");
    setIsAnalyzing(true);

    try {
      const uploadResult = await uploadPhotos(uploadedFiles);
      setUploadNotice(uploadResult.notice);

      const createdRequest = await api.createRepairRequest({
        category_slug: values.category,
        item_name: values.itemName,
        issue_description: values.description,
        urgency: values.urgency,
        pickup_preference: values.pickupPreference,
        photo_urls: uploadResult.photoUrls,
      });
      const analysisResponse = await api.analyzeRepairRequest(createdRequest.id);
      const liveMatches = await api.getRepairMatches(createdRequest.id);

      setRepairRequest(analysisResponse.repair_request);
      setAnalysis(analysisResponse.analysis);
      setMatches(liveMatches);
      setSelectedMatchId(liveMatches[0]?.id ?? "");

      startTransition(() => {
        setStep(2);
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "RepairHub could not analyze the request.");
    } finally {
      setIsAnalyzing(false);
    }
  });

  async function refreshRepairRequestState() {
    if (!repairRequest) {
      return;
    }

    setIsRefreshingSelection(true);
    setSubmitError(null);

    try {
      const [liveRequest, liveMatches] = await Promise.all([
        api.getRepairRequest(repairRequest.id),
        api.getRepairMatches(repairRequest.id),
      ]);
      setRepairRequest(liveRequest);
      setMatches(liveMatches);
      setSelectedMatchId((current) => current || liveMatches.find((match) => match.selected)?.id || liveMatches[0]?.id || "");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "RepairHub could not refresh the repairer decision.");
    } finally {
      setIsRefreshingSelection(false);
    }
  }

  async function handleSelectionRequest() {
    if (!repairRequest || !selectedMatch) {
      setSubmitError("Choose a repairer before requesting approval.");
      return;
    }

    const customerReason = (form.getValues("notes") ?? "").trim();
    if (customerReason.length < 10) {
      setSubmitError("Add a clear reason for the repairer before requesting approval.");
      return;
    }

    setSubmitError(null);
    setIsSubmittingSelection(true);

    try {
      const [updatedRequest, liveMatches] = await Promise.all([
        api.selectRepairMatch(repairRequest.id, {
          match_id: selectedMatch.id,
          customer_reason: customerReason,
        }),
        api.getRepairMatches(repairRequest.id),
      ]);
      setRepairRequest(updatedRequest);
      setMatches(liveMatches);
      setSelectedMatchId(selectedMatch.id);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "RepairHub could not send the request to the repairer.");
    } finally {
      setIsSubmittingSelection(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {["Describe", "AI Analysis", "Choose", "Review Status"].map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-full border text-sm font-semibold ${
                step >= index + 1 ? "border-[var(--green)] bg-[var(--green)] text-white" : "border-[var(--cream-3)] bg-[var(--card)] text-[var(--ink-40)]"
              }`}
            >
              {index + 1}
            </div>
            <span className="text-sm font-semibold text-[var(--ink-60)]">{label}</span>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <form className="grid gap-6 lg:grid-cols-[1.3fr_1fr]" onSubmit={(event) => void onAnalyze(event)}>
          <div className="surface-card space-y-4 p-6">
            <h2 className="display text-3xl text-[var(--green)]">Describe your item</h2>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Repair Category
              <select className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("category")}>
                <option value="">Select a category...</option>
                <option value="electronics">Electronics</option>
                <option value="furniture">Furniture</option>
                <option value="clothing">Clothing</option>
                <option value="bikes">Bikes</option>
              </select>
              <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.category?.message}</span>
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Item Name / Model
              <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" placeholder="e.g. Samsung Galaxy S23" {...form.register("itemName")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.itemName?.message}</span>
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Describe the Problem
              <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" placeholder="Describe the issue, symptoms, and when it started." {...form.register("description")} />
              <span className="mt-1 block text-xs text-[var(--amber)]">{form.formState.errors.description?.message}</span>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Urgency
                <select className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("urgency")}>
                  <option value="standard">Standard (3-5 days)</option>
                  <option value="urgent">Urgent - same day</option>
                  <option value="flexible">Flexible (7+ days)</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Pickup Preference
                <select className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" {...form.register("pickupPreference")}>
                  <option value="dropoff">I'll drop it off</option>
                  <option value="pickup">Pickup & delivery</option>
                  <option value="onsite">Repairer comes to me</option>
                </select>
              </label>
            </div>
            {submitError ? <p className="rounded-[20px] bg-[rgba(175,99,18,0.12)] p-4 text-sm text-[var(--amber)]">{submitError}</p> : null}
          </div>
          <div className="space-y-5">
            <div className="surface-card p-6">
              <h3 className="display mb-3 text-2xl text-[var(--green)]">Upload photos</h3>
              <div
                {...dropzone.getRootProps()}
                className="rounded-[24px] border border-dashed border-[var(--green-border)] bg-[var(--green-light)]/50 px-6 py-10 text-center"
              >
                <input {...dropzone.getInputProps()} />
                <p className="text-sm font-semibold text-[var(--green)]">Drag photos here or click to upload</p>
                <p className="mt-2 text-xs text-[var(--ink-60)]">JPG, PNG up to 10MB each</p>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-60)]">{uploadedFiles.length ? `${uploadedFiles.length} file(s) selected.` : "No files selected yet."}</p>
              {uploadedPreviews.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {uploadedPreviews.map((preview) => (
                    <figure key={`${preview.name}-${preview.size}`} className="overflow-hidden rounded-[20px] border border-[var(--cream-3)] bg-white">
                      <img alt={preview.name} className="h-36 w-full object-cover" src={preview.url} />
                      <figcaption className="truncate px-4 py-3 text-xs font-semibold text-[var(--ink-60)]">{preview.name}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="soft-panel rounded-[24px] p-6">
              <p className="badge badge-green mb-3">AI Damage Detection</p>
              <p className="text-sm leading-7 text-[var(--green)]">
                RepairHub will create the repair request, upload any configured photos, run backend analysis, and fetch ranked repairer matches from the live API.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]" type="button">
                Save Draft
              </button>
              <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" disabled={isAnalyzing} type="submit">
                {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {step === 2 && analysis && repairRequest ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="soft-panel rounded-[24px] p-6">
            <p className="badge badge-green mb-4">Damage Detected</p>
            <h3 className="display mb-5 text-3xl text-[var(--green)]">{analysis.damage_type}</h3>
            <div className="space-y-4 text-sm text-[var(--ink-60)]">
              <p>
                <span className="font-semibold text-[var(--ink)]">Severity:</span> {analysis.severity}
              </p>
              <p>
                <span className="font-semibold text-[var(--ink)]">Estimated repair time:</span> {analysis.estimated_hours} hour(s)
              </p>
              <p>
                <span className="font-semibold text-[var(--ink)]">Analysis summary:</span> {analysis.summary}
              </p>
              <p>
                <span className="font-semibold text-[var(--ink)]">Waste saved:</span> {analysis.waste_saved_kg} kg
              </p>
            </div>
          </div>
          <div className="surface-card p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-40)]">Cost Estimate</p>
            <p className="display mb-3 text-4xl text-[var(--ink)]">
              {formatCurrency(analysis.estimated_min_cost)} - {formatCurrency(analysis.estimated_max_cost)}
            </p>
            <p className="mb-3 text-sm leading-7 text-[var(--ink-60)]">
              Replace value estimate: {formatCurrency(analysis.replace_cost)}. Request status: {repairRequest.status.replaceAll("_", " ")}.
            </p>
            {uploadNotice ? <p className="mb-3 rounded-[18px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">{uploadNotice}</p> : null}
            {matches.length ? (
              <p className="mb-6 text-sm leading-7 text-[var(--ink-60)]">
                {matches.length} repairer match(es) were returned from the live backend for this category and urgency.
              </p>
            ) : (
              <p className="mb-6 text-sm leading-7 text-[var(--ink-60)]">
                No repairer is available for this category right now. You can still go back and adjust the category or urgency.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]" onClick={() => setStep(1)} type="button">
                Back
              </button>
              <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" onClick={() => setStep(3)} type="button">
                View Matches
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-40)]">Smart Matching</p>
              <h3 className="display text-3xl text-[var(--green)]">{sortedMatches.length} repairers matched</h3>
            </div>
            <select className="rounded-full border border-[var(--cream-3)] bg-white px-4 py-3 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="best">Best Match</option>
              <option value="price">Lowest Price</option>
              <option value="distance">Nearest</option>
            </select>
          </div>
          {sortedMatches.length ? (
            <div className="space-y-4">
              {sortedMatches.map((match, index) => (
                <div key={match.id} className="surface-card flex flex-col gap-4 rounded-[24px] p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold text-[var(--ink)]">{match.repairer_name}</h4>
                      <span className="badge badge-blue">Verified</span>
                      {index === 0 && deferredSortBy === "best" ? <span className="badge badge-green">Best Match</span> : null}
                    </div>
                    <p className="mb-2 text-sm text-[var(--ink-60)]">
                      {Number.parseFloat(match.repairer_rating).toFixed(1)} rating · {match.reviews_count} reviews · {parseNumber(match.distance_km).toFixed(1)} km · {match.repairer_city}
                    </p>
                    <p className="mb-2 text-sm text-[var(--ink-60)]">{match.service_title}</p>
                    {match.repairer_shop_name || match.repairer_shop_address ? (
                      <p className="mb-2 text-sm text-[var(--ink-60)]">
                        {match.repairer_shop_name ? `${match.repairer_shop_name} · ` : ""}
                        {match.repairer_shop_address ?? ""}
                      </p>
                    ) : null}
                    {match.repairer_shop_phone || match.repairer_shop_opening_hours ? (
                      <p className="mb-2 text-sm text-[var(--ink-60)]">
                        {match.repairer_shop_phone ? `${match.repairer_shop_phone} · ` : ""}
                        {match.repairer_shop_opening_hours ?? ""}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {[match.ranking_reason, `${match.eta_hours}h ETA`, `${match.warranty_days}-day warranty`].map((detail) => (
                        <span key={detail} className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold text-[var(--ink-60)]">
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--ink-40)]">Quote</p>
                    <p className="display text-4xl text-[var(--ink)]">{formatCurrency(match.quote_amount)}</p>
                    <p className="mb-4 text-sm text-[var(--ink-60)]">{match.service_description}</p>
                    <button
                      className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white"
                      onClick={() => {
                        setSelectedMatchId(match.id);
                        setStep(4);
                      }}
                      type="button"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="surface-card rounded-[24px] p-6">
              <h4 className="display mb-3 text-3xl text-[var(--green)]">No repairer available</h4>
              <p className="text-sm leading-7 text-[var(--ink-60)]">
                The repair request was analyzed successfully, but no repairers in the database currently match this repair category and availability.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {step === 4 ? (
        selectedMatch ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="surface-card space-y-5 p-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-40)]">Selected Repairer</p>
                <h3 className="display mb-4 text-3xl text-[var(--green)]">{selectedRepairerName}</h3>
                <p className="text-sm text-[var(--ink-60)]">
                  {selectedMatch.service_title} · {selectedMatch.repairer_city} · {selectedMatch.warranty_days}-day warranty
                </p>
                {selectedMatch.repairer_shop_name || selectedMatch.repairer_shop_address ? (
                  <p className="mt-2 text-sm text-[var(--ink-60)]">
                    {selectedMatch.repairer_shop_name ? `${selectedMatch.repairer_shop_name} · ` : ""}
                    {selectedMatch.repairer_shop_address ?? ""}
                  </p>
                ) : null}
                {selectedMatch.repairer_shop_phone || selectedMatch.repairer_shop_opening_hours ? (
                  <p className="mt-2 text-sm text-[var(--ink-60)]">
                    {selectedMatch.repairer_shop_phone ? `${selectedMatch.repairer_shop_phone} · ` : ""}
                    {selectedMatch.repairer_shop_opening_hours ?? ""}
                  </p>
                ) : null}
              </div>
              <div className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
                <span className="font-semibold text-[var(--ink)]">Repairer decision:</span> {selectionStatusLabel}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--ink-60)]">
                  Preferred Date
                  <input className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3" type="date" {...form.register("preferredDate")} />
                </label>
                <label className="block text-sm font-semibold text-[var(--ink-60)]">
                  Reason for Repairer Review
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                    placeholder="Explain clearly why you want this repairer to take the item and any important repair notes."
                    {...form.register("notes")}
                  />
                </label>
              </div>
              {repairRequest?.customer_selection_reason ? (
                <div className="rounded-[20px] bg-[var(--cream-2)] p-5 text-sm text-[var(--ink-60)]">
                  <span className="font-semibold text-[var(--ink)]">Customer reason sent:</span> {repairRequest.customer_selection_reason}
                </div>
              ) : null}
              {selectionStatus === "pending" ? (
                <div className="rounded-[20px] bg-[var(--cream-2)] p-5 text-sm text-[var(--ink-60)]">
                  Waiting for the selected repairer to approve or reject this item. Repair work starts only after approval.
                </div>
              ) : null}
              {selectionStatus === "approved" ? (
                <div className="rounded-[20px] bg-[var(--green-light)] p-5 text-sm text-[var(--green)]">
                  This repairer approved the item. They can now move it into Active Work, and payment will be requested only after the repair is marked completed.
                </div>
              ) : null}
              {selectionStatus === "rejected" ? (
                <div className="rounded-[20px] bg-[rgba(175,99,18,0.12)] p-5 text-sm text-[var(--amber)]">
                  Rejected by repairer. {repairRequest?.repairer_response_reason || "No reason was provided."}
                </div>
              ) : null}
              {submitError ? <p className="rounded-[20px] bg-[rgba(175,99,18,0.12)] p-4 text-sm text-[var(--amber)]">{submitError}</p> : null}
              <div className="flex justify-end gap-3">
                <button className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]" onClick={() => setStep(3)} type="button">
                  Back
                </button>
                {selectionStatus === "pending" || selectionStatus === "approved" ? (
                  <button
                    className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]"
                    disabled={isRefreshingSelection}
                    onClick={() => void refreshRepairRequestState()}
                    type="button"
                  >
                    {isRefreshingSelection ? "Refreshing..." : "Refresh Status"}
                  </button>
                ) : (
                  <button
                    className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white"
                    disabled={isSubmittingSelection}
                    onClick={() => void handleSelectionRequest()}
                    type="button"
                  >
                    {isSubmittingSelection ? "Sending..." : selectionStatus === "rejected" ? "Send Again" : "Request Approval"}
                  </button>
                )}
              </div>
            </div>
            <div className="surface-card p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-40)]">Repair Flow</p>
              <div className={`mb-5 rounded-[20px] border p-4 text-sm ${selectionStatus === "approved" ? "border-[var(--green-border)] bg-[var(--green-light)]/70 text-[var(--green)]" : "border-[var(--cream-3)] bg-[var(--cream-2)] text-[var(--ink-60)]"}`}>
                {selectionStatus === "approved"
                  ? "Repairer approval received. The repairer can start Active Work now, and customer payment will happen only after the item is marked completed."
                  : selectionStatus === "pending"
                    ? "Waiting for repairer approval before any work begins."
                    : selectionStatus === "rejected"
                      ? "This repairer rejected the item. Choose another repairer to continue."
                      : "Send the item to the repairer for approval to begin the repair workflow."}
              </div>
              <div className="space-y-3 text-sm text-[var(--ink-60)]">
                <div className="flex items-center justify-between">
                  <span>Repair subtotal</span>
                  <span className="font-semibold text-[var(--ink)]">{formatCurrency(selectedMatch.quote_amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform fee</span>
                  <span className="font-semibold text-[var(--ink)]">{formatCurrency(parseNumber(selectedMatch.quote_amount) * 0.05)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--cream-3)] pt-3">
                  <span className="font-semibold text-[var(--ink)]">Total</span>
                  <span className="display text-3xl text-[var(--green)]">{formatCurrency(parseNumber(selectedMatch.quote_amount) * 1.05)}</span>
                </div>
              </div>
              <div className="mt-5 rounded-[20px] border border-[var(--cream-3)] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
                Payment is no longer collected in this step. Once the repairer marks the item completed, the customer will pay from the Client Workspace.
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]"
                  disabled={isRefreshingSelection}
                  onClick={() => void refreshRepairRequestState()}
                  type="button"
                >
                  {isRefreshingSelection ? "Refreshing..." : "Refresh Repair Status"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="surface-card rounded-[24px] p-6">
            <p className="text-sm text-[var(--ink-60)]">No repairer is selected yet. Go back to the match list and choose one before continuing the repair workflow.</p>
          </div>
        )
      ) : null}
    </div>
  );
}
