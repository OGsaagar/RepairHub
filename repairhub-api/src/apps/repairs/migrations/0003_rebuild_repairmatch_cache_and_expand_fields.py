from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("repairs", "0002_alter_repairrequest_latitude_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="DELETE FROM repairs_repairmatch;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name="repairmatch",
            name="distance_km",
            field=models.DecimalField(decimal_places=2, max_digits=8),
        ),
        migrations.AlterField(
            model_name="repairmatch",
            name="score",
            field=models.DecimalField(decimal_places=2, max_digits=8),
        ),
    ]
