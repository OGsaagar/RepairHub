export type AppRole = "guest" | "customer" | "repairer" | "admin";
export type JobStatus =
  | "draft"
  | "submitted"
  | "analyzed"
  | "matching"
  | "matched"
  | "booked"
  | "awaiting_dropoff"
  | "in_repair"
  | "ready"
  | "collected"
  | "completed"
  | "disputed"
  | "cancelled";

export type ThreadSummary = {
  id: string;
  title: string;
  category: string;
  author: string;
  authorUserId?: string | null;
  replies: number;
  updatedAt: string;
  body: string;
};

export type ThreadReply = {
  id: string;
  author: string;
  authorUserId?: string | null;
  authorRole: Exclude<AppRole, "guest">;
  body: string;
  postedAt: string;
};

export type ThreadDetail = ThreadSummary & {
  replyItems: ThreadReply[];
};

export type EventSummary = {
  id: string;
  title: string;
  excerpt: string;
  when: string;
  location: string;
  lat: number;
  lng: number;
  cta: string;
};

export type TutorialSummary = {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  format: string;
  summary: string;
  youtubeUrl?: string;
};

export type RepairMatch = {
  id: string;
  repairer: string;
  initials: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  availability: string;
  quote: number;
  warrantyDays: number;
  specialties: string[];
  score: number;
};

export type ActiveRepair = {
  id: string;
  item: string;
  status: JobStatus;
  issue: string;
  repairer: string;
  rating: number;
  quote: number;
  eta: string;
  reference: string;
  timeline: string[];
  currentStep: number;
  latestUpdate: string;
};

export type HomePageData = {
  heroStats: { label: string; value: string }[];
  categories: { name: string; repairers: string }[];
  featuredRepairers: {
    name: string;
    city: string;
    rating: number;
    specialties: string[];
    quoteFrom: string;
  }[];
  tutorials: TutorialSummary[];
  threads: ThreadSummary[];
  events: EventSummary[];
};

export type CommunityData = {
  points: number;
  tutorials: TutorialSummary[];
  threads: ThreadSummary[];
  events: EventSummary[];
};

type CreateThreadInput = {
  title: string;
  category: string;
  body: string;
  author: string;
  authorUserId: string;
};

type CreateReplyInput = {
  body: string;
  author: string;
  authorUserId: string;
  authorRole: Exclude<AppRole, "guest">;
};

type UpdateThreadInput = {
  title: string;
  category: string;
  body: string;
  authorUserId: string;
};

type UpdateReplyInput = {
  body: string;
  authorUserId: string;
};

function buildYouTubeSearchUrl(title: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;
}

const homeData: HomePageData = {
  heroStats: [
    { label: "Local repairers", value: "2,840" },
    { label: "Waste diverted", value: "14.8 t" },
    { label: "Average savings", value: "A$187" },
  ],
  categories: [
    { name: "Electronics", repairers: "2,840 repairers" },
    { name: "Furniture", repairers: "1,920 repairers" },
    { name: "Clothing", repairers: "1,560 repairers" },
    { name: "Bikes", repairers: "980 repairers" },
  ],
  featuredRepairers: [
    {
      name: "Marcus Rivera",
      city: "Sydney CBD",
      rating: 4.9,
      specialties: ["Screen repair", "Phones", "Tablets"],
      quoteFrom: "A$95",
    },
    {
      name: "Priya Tanaka",
      city: "Parramatta",
      rating: 4.7,
      specialties: ["Samsung", "Battery", "Diagnostics"],
      quoteFrom: "A$110",
    },
    {
      name: "Sofia Laurent",
      city: "Marrickville",
      rating: 4.8,
      specialties: ["Leather", "Tailoring", "Alterations"],
      quoteFrom: "A$40",
    },
  ],
  tutorials: [
    {
      id: "phone-battery",
      title: "Replace a Phone Battery",
      category: "Electronics",
      level: "Beginner",
      duration: "12 min",
      format: "Video",
      summary: "Safely replace a phone battery with common tools and a simple teardown plan.",
      youtubeUrl: buildYouTubeSearchUrl("Replace a Phone Battery"),
    },
    {
      id: "denim-seam",
      title: "Mend a Torn Seam",
      category: "Clothing",
      level: "Easy",
      duration: "8 min",
      format: "Video",
      summary: "Repair ripped denim seams with strong thread and durable finishing stitches.",
      youtubeUrl: buildYouTubeSearchUrl("Mend a Torn Seam"),
    },
    {
      id: "chair-leg",
      title: "Fix a Wobbly Chair Leg",
      category: "Furniture",
      level: "Intermediate",
      duration: "15 min",
      format: "Video",
      summary: "Stabilize loose chair joints without over-clamping or damaging the finish.",
      youtubeUrl: buildYouTubeSearchUrl("Fix a Wobbly Chair Leg"),
    },
  ],
  threads: [],
  events: [
    {
      id: "electronics-repair-cafe",
      title: "Sydney Repair Cafe",
      excerpt: "Bring broken gadgets and get help from volunteers and local pros.",
      when: "5 April, 10:00 am - 2:00 pm",
      location: "Redfern Community Centre, Sydney",
      lat: -33.8925,
      lng: 151.2048,
      cta: "Join",
    },
    {
      id: "fix-your-bike-day",
      title: "Inner West Bike Fix Day",
      excerpt: "Free bike maintenance workshop for every skill level.",
      when: "12 April, 9:00 am - 1:00 pm",
      location: "Sydney Park Cycling Hub, Alexandria",
      lat: -33.9102,
      lng: 151.1887,
      cta: "RSVP",
    },
    {
      id: "upcycling-workshop",
      title: "Clothing Upcycling Workshop",
      excerpt: "Transform old clothes into pieces worth keeping.",
      when: "19 April, 2:00 pm - 5:00 pm",
      location: "Brunswick Maker Studio, Melbourne",
      lat: -37.7658,
      lng: 144.9631,
      cta: "RSVP",
    },
  ],
};

const defaultThreads: ThreadDetail[] = [
  {
    id: "laptop-charge",
    title: "Laptop won't charge even with new cable. Any ideas?",
    category: "Electronics",
    author: "Elena K.",
    authorUserId: "seed-customer-elena",
    replies: 2,
    updatedAt: "2h ago",
    body: "Start with the port, adapter wattage, and battery health report before assuming the logic board failed.",
    replyItems: [
      {
        id: "laptop-charge-reply-1",
        author: "Marcus R.",
        authorUserId: "seed-repairer-marcus",
        authorRole: "repairer",
        body: "Check whether the charging port feels loose or only charges when the cable is held at an angle. That often points to port wear before board damage.",
        postedAt: "1h ago",
      },
      {
        id: "laptop-charge-reply-2",
        author: "Nadia P.",
        authorUserId: "seed-customer-nadia",
        authorRole: "customer",
        body: "I had the same issue and the adapter wattage was the cause. Compare the charger output against the laptop's required wattage before opening it up.",
        postedAt: "45m ago",
      },
    ],
  },
  {
    id: "best-denim-thread",
    title: "Best thread type for repairing denim jeans?",
    category: "Clothing",
    author: "Pierre W.",
    authorUserId: "seed-customer-pierre",
    replies: 2,
    updatedAt: "5h ago",
    body: "Use topstitch or heavy-duty polyester and match the original stitch density to avoid puckering.",
    replyItems: [
      {
        id: "best-denim-thread-reply-1",
        author: "Sofia L.",
        authorUserId: "seed-repairer-sofia",
        authorRole: "repairer",
        body: "Topstitch thread works well if your machine can tension it correctly. For hand repair, a strong polyester thread gives cleaner control.",
        postedAt: "4h ago",
      },
      {
        id: "best-denim-thread-reply-2",
        author: "Mina K.",
        authorUserId: "seed-customer-mina",
        authorRole: "customer",
        body: "I doubled the thread on my last repair and it got bulky. Matching the original stitch spacing mattered more than using extra thickness.",
        postedAt: "3h ago",
      },
    ],
  },
  {
    id: "water-stain-table",
    title: "How to remove a water stain from a hardwood table?",
    category: "Furniture",
    author: "Mia O.",
    authorUserId: "seed-customer-mia",
    replies: 2,
    updatedAt: "1d ago",
    body: "Most light rings respond to low heat and a dry cloth before you move to refinishing.",
    replyItems: [
      {
        id: "water-stain-table-reply-1",
        author: "Lina O.",
        authorUserId: "seed-repairer-lina",
        authorRole: "repairer",
        body: "Keep the heat low and keep the cloth moving. If you hold heat in one spot too long you can haze the finish.",
        postedAt: "20h ago",
      },
      {
        id: "water-stain-table-reply-2",
        author: "Ben C.",
        authorUserId: "seed-customer-ben",
        authorRole: "customer",
        body: "A microfiber cloth worked better for me than a paper towel because it distributed the heat more evenly.",
        postedAt: "18h ago",
      },
    ],
  },
];

let communityThreads = [...defaultThreads];

function summarizeThread(thread: ThreadDetail): ThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    category: thread.category,
    author: thread.author,
    authorUserId: thread.authorUserId,
    replies: thread.replies,
    updatedAt: thread.updatedAt,
    body: thread.body,
  };
}

export const analysisFixture = {
  damageType: "Cracked screen + LCD damage",
  severity: "Moderate",
  costRange: "A$80-A$130",
  repairTime: "1-2 hours",
  savings: "A$770 saved and 14 kg of e-waste avoided",
};

export const repairMatchesFixture: RepairMatch[] = [
  {
    id: "marcus-rivera",
    repairer: "Marcus Rivera",
    initials: "MR",
    rating: 4.9,
    reviews: 127,
    distanceKm: 2.4,
    availability: "Available today",
    quote: 95,
    warrantyDays: 7,
    specialties: ["Electronics", "Screen repair", "Phones"],
    score: 98,
  },
  {
    id: "priya-tanaka",
    repairer: "Priya Tanaka",
    initials: "PT",
    rating: 4.7,
    reviews: 82,
    distanceKm: 4.1,
    availability: "Available tomorrow",
    quote: 110,
    warrantyDays: 30,
    specialties: ["Electronics", "Samsung", "Battery"],
    score: 87,
  },
  {
    id: "aiden-kim",
    repairer: "Aiden Kim",
    initials: "AK",
    rating: 4.8,
    reviews: 103,
    distanceKm: 3.1,
    availability: "Pickup and delivery",
    quote: 104,
    warrantyDays: 14,
    specialties: ["Diagnostics", "Tablets", "Express"],
    score: 90,
  },
];

const clientRepairs: ActiveRepair[] = [
  {
    id: "iphone-14-pro",
    item: "iPhone 14 Pro",
    status: "in_repair",
    issue: "Cracked screen + LCD damage",
    repairer: "Marcus Rivera",
    rating: 4.9,
    quote: 95,
    eta: "Today, 5:00 pm",
    reference: "RH-2847",
    timeline: ["Submitted", "Matched", "Dropped Off", "In Repair", "Ready", "Collected"],
    currentStep: 3,
    latestUpdate: "Screen replaced successfully. Touch calibration testing is in progress.",
  },
  {
    id: "leather-jacket",
    item: "Leather Jacket",
    status: "ready",
    issue: "Torn lining + zip replacement",
    repairer: "Sofia Laurent",
    rating: 4.8,
    quote: 40,
    eta: "Ready for pickup",
    reference: "RH-2741",
    timeline: ["Submitted", "Matched", "Dropped Off", "In Repair", "Ready", "Collected"],
    currentStep: 4,
    latestUpdate: "Your repair is ready for collection.",
  },
  {
    id: "galaxy-s23",
    item: "Samsung Galaxy S23",
    status: "matching",
    issue: "Battery drain + slow charging",
    repairer: "Matching engine",
    rating: 0,
    quote: 58,
    eta: "Estimated match in 15 min",
    reference: "RH-2891",
    timeline: ["Submitted", "Matching", "Dropped Off", "In Repair", "Ready", "Collected"],
    currentStep: 1,
    latestUpdate: "AI estimate is ready and the request is being routed to nearby repairers.",
  },
];

const repairerDashboardData = {
  stats: [
    { label: "This Month", value: "A$1,240", detail: "+18% vs last month" },
    { label: "Jobs Done", value: "23", detail: "+3 this week" },
    { label: "Avg Rating", value: "4.9", detail: "127 total reviews" },
    { label: "Active Jobs", value: "3", detail: "2 awaiting pickup" },
  ],
  activeJobs: [
    { customer: "James Liu", item: "iPhone 14 screen crack", status: "In Progress", due: "Due today", amount: "A$95" },
    { customer: "Amara Nwosu", item: "Laptop keyboard replacement", status: "Awaiting Pickup", due: "Today 3:00 pm", amount: "A$120" },
    { customer: "Tom Sorensen", item: "iPad Pro charging port", status: "Pending Acceptance", due: "45 mins ago", amount: "A$75" },
  ],
  history: [
    { customer: "Yuki Tanaka", item: "Samsung Galaxy screen", date: "28 Mar", earned: "A$85", rating: "5.0", status: "Completed" },
    { customer: "Chen Wei", item: "MacBook Pro battery", date: "25 Mar", earned: "A$140", rating: "4.8", status: "Completed" },
    { customer: "Fatima Al-Rashid", item: "iPhone 13 camera", date: "22 Mar", earned: "A$110", rating: "5.0", status: "Completed" },
  ],
};

const adminOverview = {
  queues: [
    { label: "Repairer Applications", value: 12, helper: "4 require ID verification" },
    { label: "Open Disputes", value: 3, helper: "1 older than 48 hours" },
    { label: "Pending Payouts", value: 18, helper: "A$3,420 net release value" },
    { label: "Forum Flags", value: 7, helper: "2 auto-hidden for review" },
  ],
  applications: [
    { name: "Aiden Kim", category: "Electronics", city: "Chatswood", status: "Pending verification" },
    { name: "Lina Ortega", category: "Furniture", city: "Newtown", status: "Awaiting portfolio review" },
  ],
  payouts: [
    { repairer: "Marcus Rivera", amount: "A$242", status: "Ready to release" },
    { repairer: "Sofia Laurent", amount: "A$88", status: "Hold until collection confirmed" },
  ],
  disputes: [
    { reference: "RH-2701", issue: "Repair quality challenge", owner: "Ops - Maya", priority: "High" },
    { reference: "RH-2719", issue: "Pickup missed twice", owner: "Ops - Devon", priority: "Medium" },
  ],
};

export const chatMessages = [
  { from: "repairer", body: "Screen parts arrived. Starting work now. Should take about two hours.", time: "11:03 am" },
  { from: "customer", body: "Will the phone be ready before 5:00 pm?", time: "11:15 am" },
  { from: "repairer", body: "Yes. I will send a notification once testing is complete.", time: "11:18 am" },
];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), 120));
}

function requireThread(threadId: string) {
  const thread = communityThreads.find((item) => item.id === threadId);
  if (!thread) {
    throw new Error("Thread not found.");
  }
  return thread;
}

function requireThreadOwner(thread: ThreadDetail, authorUserId: string) {
  if (thread.authorUserId !== authorUserId) {
    throw new Error("You can only edit or delete your own questions.");
  }
}

function requireReplyOwner(reply: ThreadReply, authorUserId: string) {
  if (reply.authorUserId !== authorUserId) {
    throw new Error("You can only edit or delete your own replies.");
  }
}

function upsertThread(thread: ThreadDetail) {
  communityThreads = [thread, ...communityThreads.filter((item) => item.id !== thread.id)];
  return thread;
}

export function fetchHomePageData() {
  return delay({
    ...homeData,
    threads: communityThreads.map(summarizeThread),
  });
}

export function fetchCommunityData() {
  return delay({
    points: 840,
    tutorials: homeData.tutorials,
    threads: communityThreads.map(summarizeThread),
    events: homeData.events,
  });
}

export function fetchClientWorkspaceData() {
  return delay({
    summary: {
      name: "Elena Adeyemi",
      totalRepairs: 7,
      moneySaved: "A$640",
      co2Avoided: "9.2 kg",
      greenPoints: 840,
    },
    activeRepairs: clientRepairs,
    pastRepairs: [
      { item: "MacBook Air - Fan Replacement", repairer: "Marcus Rivera", date: "14 Feb 2025", amount: "A$120", rating: 5 },
      { item: "Road Bike - Brake Cable Set", repairer: "Aiden Kim", date: "28 Jan 2025", amount: "A$55", rating: 4 },
    ],
  });
}

export function fetchRepairerDashboardData() {
  return delay(repairerDashboardData);
}

export function fetchAdminOverview() {
  return delay(adminOverview);
}

export function fetchThreadById(threadId: string) {
  return delay(communityThreads.find((thread) => thread.id === threadId) ?? communityThreads[0]);
}

export function fetchEventById(eventId: string) {
  return delay(homeData.events.find((event) => event.id === eventId) ?? homeData.events[0]);
}

export const realtimeStatusEvent = {
  type: "job.status_changed" as const,
  payload: {
    jobId: "iphone-14-pro",
    status: "ready" as JobStatus,
    latestUpdate: "Calibration passed. Your phone is ready for pickup.",
    eta: "Ready for pickup",
  },
};

export function createCommunityThread(input: CreateThreadInput) {
  const thread: ThreadDetail = {
    id: `${input.category.toLowerCase()}-${Date.now()}`,
    title: input.title,
    category: input.category,
    author: input.author,
    authorUserId: input.authorUserId,
    replies: 0,
    updatedAt: "Just now",
    body: input.body,
    replyItems: [],
  };

  return delay(upsertThread(thread));
}

export function createCommunityReply(threadId: string, input: CreateReplyInput) {
  const existingThread = requireThread(threadId);

  const updatedThread: ThreadDetail = {
    ...existingThread,
    updatedAt: "Just now",
    replyItems: [
      {
        id: `${threadId}-reply-${Date.now()}`,
        author: input.author,
        authorUserId: input.authorUserId,
        authorRole: input.authorRole,
        body: input.body,
        postedAt: "Just now",
      },
      ...existingThread.replyItems,
    ],
  };

  updatedThread.replies = updatedThread.replyItems.length;
  return delay(upsertThread(updatedThread));
}

export function updateCommunityThread(threadId: string, input: UpdateThreadInput) {
  const existingThread = requireThread(threadId);
  requireThreadOwner(existingThread, input.authorUserId);

  const updatedThread: ThreadDetail = {
    ...existingThread,
    title: input.title,
    category: input.category,
    body: input.body,
    updatedAt: "Just now",
  };

  return delay(upsertThread(updatedThread));
}

export function deleteCommunityThread(threadId: string, authorUserId: string) {
  const existingThread = requireThread(threadId);
  requireThreadOwner(existingThread, authorUserId);
  communityThreads = communityThreads.filter((thread) => thread.id !== threadId);
  return delay(threadId);
}

export function updateCommunityReply(threadId: string, replyId: string, input: UpdateReplyInput) {
  const existingThread = requireThread(threadId);
  const existingReply = existingThread.replyItems.find((reply) => reply.id === replyId);
  if (!existingReply) {
    throw new Error("Reply not found.");
  }
  requireReplyOwner(existingReply, input.authorUserId);

  const updatedThread: ThreadDetail = {
    ...existingThread,
    updatedAt: "Just now",
    replyItems: existingThread.replyItems.map((reply) =>
      reply.id === replyId
        ? {
            ...reply,
            body: input.body,
            postedAt: "Edited just now",
          }
        : reply,
    ),
  };

  return delay(upsertThread(updatedThread));
}

export function deleteCommunityReply(threadId: string, replyId: string, authorUserId: string) {
  const existingThread = requireThread(threadId);
  const existingReply = existingThread.replyItems.find((reply) => reply.id === replyId);
  if (!existingReply) {
    throw new Error("Reply not found.");
  }
  requireReplyOwner(existingReply, authorUserId);

  const updatedThread: ThreadDetail = {
    ...existingThread,
    updatedAt: "Just now",
    replyItems: existingThread.replyItems.filter((reply) => reply.id !== replyId),
  };
  updatedThread.replies = updatedThread.replyItems.length;
  return delay(upsertThread(updatedThread));
}

export function resetCommunityThreads() {
  communityThreads = [...defaultThreads];
}
