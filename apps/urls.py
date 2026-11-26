from django.urls import path
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.views import (RegisterApiView, GuestListCreateView, GuestDetailView, DashboardAPIView, MeApiVIew, \
    BudgetListCreateView, BudgetDetailView, TaskListCreateView, TaskDetailView, VendorListView, VendorDetailView , ChangePasswordView, VendorReviewListCreateView,
    ReviewDetailView, PlanPricesApiView)

urlpatterns = [


    path('dashboard/', DashboardAPIView.as_view(), name='api-dashboard'),
    path('users/me/', MeApiVIew.as_view(), name='api-me'),
    path('guests/', GuestListCreateView.as_view(), name='api-guests'),
    path('guests/<int:pk>/', GuestDetailView.as_view(), name='api-guest-detail'),
    path('budget/', BudgetListCreateView.as_view(), name='api-budget'),
    path('budget/<int:pk>/', BudgetDetailView.as_view(), name='api-budget-detail'),
    path('tasks/', TaskListCreateView.as_view(), name='api-tasks'),
    path('tasks/<int:pk>', TaskDetailView.as_view(), name='api-tasks-detail'),
    path('vendors/', VendorListView.as_view(), name='api-vendors'),
    path('vendors/<int:pk>/', VendorDetailView.as_view(), name='api-vendor-detail'),
    path('vendors/<int:vendor_id>/reviews/', VendorReviewListCreateView.as_view(), name='api-vendor-reviews'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='api-review-detail'),
    path('users/register/', RegisterApiView.as_view(), name='api-register'),
    path('users/change-password/', ChangePasswordView.as_view(), name='api-change-password'),
    path('plans/prices/', PlanPricesApiView.as_view(), name='api-plan-prices'),
    path('users/login/', TokenObtainPairView.as_view(), name='api-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]