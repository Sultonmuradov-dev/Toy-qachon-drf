from django.contrib import admin
from apps.models import Vendor, VendorImage


class VendorImageInline(admin.TabularInline):
    model = VendorImage
    extra = 1


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'city', 'phone_number', 'rating', 'is_active']
    list_filter = ['category', 'city', 'is_active']
    search_fields = ['name', 'city', 'phone_number']
    list_editable = ['is_active']
    inlines = [VendorImageInline]
