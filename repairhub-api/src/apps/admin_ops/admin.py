from django.apps import apps as django_apps
from django.contrib import admin


admin.site.site_header = "RepairHub Admin"
admin.site.site_title = "RepairHub Admin"
admin.site.index_title = "RepairHub Objects"


for model in django_apps.get_models():
    app_config = django_apps.get_app_config(model._meta.app_label)
    if not app_config.name.startswith("apps."):
        continue
    if model in admin.site._registry:
        continue
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        continue
