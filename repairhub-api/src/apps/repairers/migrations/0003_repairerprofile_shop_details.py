from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("repairers", "0002_alter_repairerprofile_latitude_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="repairerprofile",
            name="shop_address",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="repairerprofile",
            name="shop_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="repairerprofile",
            name="shop_opening_hours",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="repairerprofile",
            name="shop_phone",
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
