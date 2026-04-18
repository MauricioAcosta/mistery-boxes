"""
Demo seed data — 4 boxes × multiple products.

House edge per box is ~28-32 % (RTP ~70 %).
Math check: EV = sum(retail_value_i * weight_i / total_weight)
            house_edge = 1 - EV / box_price
"""
from .extensions import db
from .models import Product, Box, BoxItem, User, Wallet
from .services.provably_fair import ProvablyFairService


def seed_demo_data():
    if Product.query.first():
        return  # already seeded

    # ── Products ────────────────────────────────────────────────────────────
    products = [
        Product(name="iPhone 15 Pro Max", brand="Apple", category="tech",
                retail_value=1199.00, rarity="legendary",
                description="Latest Apple flagship smartphone.",
                image_url="https://images.unsplash.com/photo-1695048064168-3fa9ad8d5ddb?w=400"),
        Product(name="AirPods Pro 2nd Gen", brand="Apple", category="tech",
                retail_value=249.00, rarity="epic",
                description="Premium noise-cancelling wireless earbuds.",
                image_url="https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400"),
        Product(name="Nintendo Switch OLED", brand="Nintendo", category="gaming",
                retail_value=349.00, rarity="epic",
                description="OLED hybrid gaming console.",
                image_url="https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400"),
        Product(name="PS5 DualSense Controller", brand="Sony", category="gaming",
                retail_value=69.99, rarity="rare",
                description="Next-gen haptic feedback controller.",
                image_url="https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400"),
        Product(name="Nike Air Max 90", brand="Nike", category="fashion",
                retail_value=120.00, rarity="rare",
                description="Iconic street sneaker.",
                image_url="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400"),
        Product(name="Adidas Sport Hoodie", brand="Adidas", category="fashion",
                retail_value=65.00, rarity="uncommon",
                description="Premium performance hoodie.",
                image_url="https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400"),
        Product(name="Supreme Branded Cap", brand="Supreme", category="fashion",
                retail_value=48.00, rarity="uncommon",
                description="Limited-edition streetwear cap.",
                image_url="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400"),
        Product(name="Protective Phone Case", brand="Generic", category="accessories",
                retail_value=15.00, rarity="common",
                description="Durable silicone phone case.",
                image_url="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400"),
        Product(name="Collectible Keychain", brand="Generic", category="accessories",
                retail_value=5.00, rarity="common",
                description="Enamel collectible keychain.",
                image_url="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"),
        Product(name="MacBook Air M2", brand="Apple", category="tech",
                retail_value=1099.00, rarity="legendary",
                description="Ultra-thin laptop with Apple Silicon.",
                image_url="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400"),
        Product(name="Sony WH-1000XM5", brand="Sony", category="tech",
                retail_value=349.00, rarity="epic",
                description="Industry-leading noise-cancelling headphones.",
                image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"),
        Product(name="Keychron K2 Keyboard", brand="Keychron", category="tech",
                retail_value=89.99, rarity="rare",
                description="Compact wireless mechanical keyboard.",
                image_url="https://images.unsplash.com/photo-1561112078-7d24e04c3407?w=400"),
        Product(name="Logitech G Pro Mouse", brand="Logitech", category="gaming",
                retail_value=59.99, rarity="uncommon",
                description="Pro-grade wireless gaming mouse.",
                image_url="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400"),
        Product(name="Steam Gift Card $20", brand="Steam", category="gaming",
                retail_value=20.00, rarity="common",
                description="$20 Steam wallet credit.",
                image_url="https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400"),
        Product(name="Samsung Galaxy S24", brand="Samsung", category="tech",
                retail_value=799.00, rarity="legendary",
                description="Flagship Android smartphone with AI features.",
                image_url="https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400"),
    ]
    for p in products:
        db.session.add(p)
    db.session.flush()
    pm = {p.name: p for p in products}

    # ── Box 1: Tech Starter — $10 — RTP ≈ 70 % ─────────────────────────────
    # EV = (1199×1 + 249×5 + 69.99×10 + 48×30 + 15×104 + 5×50) / 200
    #    = (1199 + 1245 + 699.9 + 1440 + 1560 + 250) / 200 = 6393.9/200 ≈ 7.00  ✓
    b1 = Box(name="Tech Starter", price=10.00, category="tech",
             description="Affordable tech prizes — with a shot at premium gear!",
             image_url="https://images.unsplash.com/photo-1518770660439-4636190af475?w=400")
    db.session.add(b1)
    db.session.flush()
    for product, weight in [
        ("iPhone 15 Pro Max", 1), ("AirPods Pro 2nd Gen", 5),
        ("PS5 DualSense Controller", 10), ("Supreme Branded Cap", 30),
        ("Protective Phone Case", 104), ("Collectible Keychain", 50),
    ]:
        db.session.add(BoxItem(box_id=b1.id, product_id=pm[product].id, weight=weight))

    # ── Box 2: Gaming Paradise — $25 — RTP ≈ 70 % ───────────────────────────
    b2 = Box(name="Gaming Paradise", price=25.00, category="gaming",
             description="All the gear a serious gamer could want.",
             image_url="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400")
    db.session.add(b2)
    db.session.flush()
    for product, weight in [
        ("Nintendo Switch OLED", 3), ("PS5 DualSense Controller", 10),
        ("Keychron K2 Keyboard", 20), ("Logitech G Pro Mouse", 40),
        ("Steam Gift Card $20", 77), ("Collectible Keychain", 50),
    ]:
        db.session.add(BoxItem(box_id=b2.id, product_id=pm[product].id, weight=weight))

    # ── Box 3: Apple Premium — $50 — RTP ≈ 70 % ────────────────────────────
    b3 = Box(name="Apple Premium", price=50.00, category="tech",
             description="Luxury Apple ecosystem — every drop is a win.",
             image_url="https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400")
    db.session.add(b3)
    db.session.flush()
    for product, weight in [
        ("MacBook Air M2", 1), ("iPhone 15 Pro Max", 2),
        ("AirPods Pro 2nd Gen", 8), ("Sony WH-1000XM5", 10),
        ("Keychron K2 Keyboard", 25), ("Supreme Branded Cap", 54),
    ]:
        db.session.add(BoxItem(box_id=b3.id, product_id=pm[product].id, weight=weight))

    # ── Box 4: Fashion Drop — $20 — RTP ≈ 70 % ─────────────────────────────
    b4 = Box(name="Fashion Drop", price=20.00, category="fashion",
             description="Streetwear & premium fashion — fresh fits every time.",
             image_url="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400")
    db.session.add(b4)
    db.session.flush()
    for product, weight in [
        ("Nike Air Max 90", 15), ("Adidas Sport Hoodie", 25),
        ("Supreme Branded Cap", 60), ("Collectible Keychain", 100),
    ]:
        db.session.add(BoxItem(box_id=b4.id, product_id=pm[product].id, weight=weight))

    # ── Admin user ──────────────────────────────────────────────────────────
    if not User.query.filter_by(email='admin@mysteryboxes.com').first():
        admin = User(username='admin', email='admin@mysteryboxes.com', role='admin')
        admin.set_password('Admin123!')
        db.session.add(admin)
        db.session.flush()
        db.session.add(Wallet(user_id=admin.id))
        db.session.flush()
        ProvablyFairService.create_seed_pair(admin.id)

    db.session.commit()
    print("[seed] Demo data loaded. Admin: admin@mysteryboxes.com / Admin123!")
