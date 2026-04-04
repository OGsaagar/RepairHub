import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0001_initial"),
        ("repairers", "0002_alter_repairerprofile_latitude_and_more"),
        ("repairs", "0003_rebuild_repairmatch_cache_and_expand_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="repairrequest",
            name="customer_selection_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="repairrequest",
            name="repairer_response_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="repairrequest",
            name="selected_quote_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name="repairrequest",
            name="selected_repairer",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="selected_repair_requests", to="repairers.repairerprofile"),
        ),
        migrations.AddField(
            model_name="repairrequest",
            name="selected_service",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="selected_repair_requests", to="catalog.repairerservice"),
        ),
        migrations.AddField(
            model_name="repairrequest",
            name="selection_status",
            field=models.CharField(
                choices=[("none", "None"), ("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
                default="none",
                max_length=20,
            ),
        ),
    ]
