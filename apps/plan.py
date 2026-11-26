from rest_framework.exceptions import ValidationError
from apps.models import BudgetItem, Guests, Task



PLAN_LIMITS = {
    'free': {'guests': 30, 'budget_items': 5, 'tasks': 20},
    'premium': {'guests': None, 'budget_items': None, 'tasks': None},
    'vip': {'guests': None, 'budget_items': None, 'tasks': None},
}

PLAN_DURATIONS = {
    '1m': {'days': 30, 'price': 79990, 'label': '1 oy'},
    '3m': {'days': 90, 'price': 215990, 'label': '3 oy', 'discount': 10},
    '6m': {'days': 180, 'price': 383990, 'label': '6 oy', 'discount': 20},
}

PLAN_LABELS = {'free': 'Bepul', 'premium': 'Premium', 'vip': 'VIP'}

LIMIT_MESSAGES = {
    'guests': "Bepul tarifda 30 tadan ko'p mehmon qo'shib bo'lmaydi. Premium tarifga o'ting.",
    'budget_items': "Bepul tarifda 5 tadan ko'p byudjet kategoriyasi qo'shib bo'lmaydi. Premium tarifga o'ting.",
    'tasks': "Bepul tarifda 20 tadan ko'p vazifa qo'shib bo'lmaydi. Premium tarifga o'ting.",
}

MODELS = {'guests': Guests, 'budget_items': BudgetItem, 'tasks': Task}


def _count(user, key):
    return MODELS[key].objects.filter(user=user).count()


def check_limit(user, key):
    limit = PLAN_LIMITS[user.active_plan][key]
    if limit is not None and _count(user, key) >= limit:
        raise ValidationError({'detail': LIMIT_MESSAGES[key]})


def plan_summary(user):
    plan = user.active_plan
    usage = {}
    for key in MODELS:
        usage[key] = {'used': _count(user, key), 'limit': PLAN_LIMITS[plan][key]}
    return {
        'name': plan,
        'label': PLAN_LABELS[plan],
        'expires_at': user.plan_expires_at if plan != 'free' else None,
        'usage': usage,
    }