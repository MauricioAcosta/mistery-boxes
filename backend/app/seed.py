"""
Demo seed data — products segmented by client_id + multi-provider boxes.

House edge per box ≈ 28-32 % (RTP ≈ 70 %).
Math check: EV = Σ(retail_value_i × weight_i / total_weight)
            house_edge = 1 − EV / box_price
"""
from .extensions import db
from .models import Product, Box, BoxItem, User, Wallet
from .services.provably_fair import ProvablyFairService


def _add_items(box, pm, items):
    for name, weight in items:
        db.session.add(BoxItem(box_id=box.id, product_id=pm[name].id, weight=weight))


def seed_demo_data():
    if Product.query.first():
        return  # already seeded

    # ── Products: Xiaomi ────────────────────────────────────────────────────
    xiaomi_products = [
        Product(name="Xiaomi 14 Ultra", brand="Xiaomi", category="tech",
                retail_value=1299.00, rarity="legendary", client_id="xiaomi",
                description="Flagship con cámara Leica y Snapdragon 8 Gen 3.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg"),
        Product(name="Xiaomi 13T Pro", brand="Xiaomi", category="tech",
                retail_value=699.00, rarity="epic", client_id="xiaomi",
                description="Cámara Leica 50 MP, carga 120W.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/xiaomi-13t-pro.jpg"),
        Product(name="Redmi Note 13 Pro+", brand="Xiaomi", category="tech",
                retail_value=399.00, rarity="rare", client_id="xiaomi",
                description="200 MP + carga 120W en gama media.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro.jpg"),
        Product(name="Xiaomi Buds 4 Pro", brand="Xiaomi", category="tech",
                retail_value=149.00, rarity="uncommon", client_id="xiaomi",
                description="ANC adaptativa, batería 38 h.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/xiaomi-buds-4-pro.jpg"),
        Product(name="Xiaomi Smart Band 8 Pro", brand="Xiaomi", category="tech",
                retail_value=79.00, rarity="uncommon", client_id="xiaomi",
                description="AMOLED rectangular, GPS integrado.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/xiaomi-smart-band-8-pro.jpg"),
        Product(name="Redmi Pad SE", brand="Xiaomi", category="tech",
                retail_value=199.00, rarity="rare", client_id="xiaomi",
                description="Pantalla 11\" FHD+, batería 8000 mAh.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-pad-se.jpg"),
        Product(name="Xiaomi Mi Watch S3", brand="Xiaomi", category="tech",
                retail_value=119.00, rarity="uncommon", client_id="xiaomi",
                description="AMOLED 1.43\", carga 5W, Hyper OS.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/xiaomi-watch-s3.jpg"),
        Product(name="Cargador Xiaomi 120W", brand="Xiaomi", category="accessories",
                retail_value=29.00, rarity="common", client_id="xiaomi",
                description="Carga turbo compatible GaN.",
                image_url="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400"),
        Product(name="Funda Xiaomi Premium", brand="Xiaomi", category="accessories",
                retail_value=15.00, rarity="common", client_id="xiaomi",
                description="Funda oficial de cuero vegano.",
                image_url="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400"),
    ]

    # ── Products: OPPO ──────────────────────────────────────────────────────
    oppo_products = [
        Product(name="OPPO Find X7 Ultra", brand="OPPO", category="tech",
                retail_value=1199.00, rarity="legendary", client_id="oppo",
                description="Hasselblad quad-cam, Dimensity 9300.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/oppo-find-x7-ultra.jpg"),
        Product(name="OPPO Reno 11 Pro", brand="OPPO", category="tech",
                retail_value=549.00, rarity="epic", client_id="oppo",
                description="Diseño curvo, cámara retrato 50 MP.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/oppo-reno11-pro.jpg"),
        Product(name="OPPO A79 5G", brand="OPPO", category="tech",
                retail_value=299.00, rarity="rare", client_id="oppo",
                description="5G accesible, AMOLED 90 Hz.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/oppo-a79-5g.jpg"),
        Product(name="OPPO Watch 4 Pro", brand="OPPO", category="tech",
                retail_value=399.00, rarity="epic", client_id="oppo",
                description="AMOLED cuadrado, ECG, carga 67W.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/oppo-watch-4-pro.jpg"),
        Product(name="OPPO Enco X3", brand="OPPO", category="tech",
                retail_value=179.00, rarity="rare", client_id="oppo",
                description="Co-tuneado con Dynaudio, ANC.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/oppo-enco-x3.jpg"),
        Product(name="OPPO Pad 2", brand="OPPO", category="tech",
                retail_value=449.00, rarity="epic", client_id="oppo",
                description="MediaTek Dimensity 9000, 12\" OLED.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/oppo-pad-2.jpg"),
        Product(name="Cargador OPPO SUPERVOOC 80W", brand="OPPO", category="accessories",
                retail_value=35.00, rarity="common", client_id="oppo",
                description="Carga ultrarrápida SUPERVOOC.",
                image_url="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400"),
        Product(name="Funda OPPO Original", brand="OPPO", category="accessories",
                retail_value=18.00, rarity="common", client_id="oppo",
                description="Funda oficial silicona liquid.",
                image_url="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400"),
    ]

    # ── Products: Motorola ──────────────────────────────────────────────────
    motorola_products = [
        Product(name="Motorola Edge 50 Ultra", brand="Motorola", category="tech",
                retail_value=999.00, rarity="legendary", client_id="motorola",
                description="Snapdragon 8s Gen 3, cámara 50MP OIS.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-ultra.jpg"),
        Product(name="Motorola Edge 50 Pro", brand="Motorola", category="tech",
                retail_value=649.00, rarity="epic", client_id="motorola",
                description="pOLED 144 Hz, carga 125W TurboPower.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/motorola-edge-50-pro.jpg"),
        Product(name="Moto G84 5G", brand="Motorola", category="tech",
                retail_value=299.00, rarity="rare", client_id="motorola",
                description="pOLED 6.5\", 50 MP, Snapdragon 695.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-g84.jpg"),
        Product(name="Motorola Moto Buds+", brand="Motorola", category="tech",
                retail_value=129.00, rarity="uncommon", client_id="motorola",
                description="Diseñados con Bose, ANC híbrido.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-buds.jpg"),
        Product(name="Motorola Watch 70", brand="Motorola", category="tech",
                retail_value=99.00, rarity="uncommon", client_id="motorola",
                description="GPS integrado, 14 días batería.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-watch-70.jpg"),
        Product(name="Moto G14", brand="Motorola", category="tech",
                retail_value=149.00, rarity="common", client_id="motorola",
                description="Helio G85, 4 GB RAM, cámara 50 MP.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-g14.jpg"),
        Product(name="Cargador TurboPower 30W Moto", brand="Motorola", category="accessories",
                retail_value=25.00, rarity="common", client_id="motorola",
                description="Carga rápida TurboPower original.",
                image_url="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400"),
    ]

    # ── Products: Samsung ───────────────────────────────────────────────────
    samsung_products = [
        Product(name="Samsung Galaxy S24 Ultra", brand="Samsung", category="tech",
                retail_value=1299.00, rarity="legendary", client_id="samsung",
                description="S Pen, Snapdragon 8 Gen 3, zoom 200x.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra.jpg"),
        Product(name="Samsung Galaxy S24+", brand="Samsung", category="tech",
                retail_value=999.00, rarity="epic", client_id="samsung",
                description="Snapdragon 8 Gen 3, AMOLED 120 Hz.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24plus.jpg"),
        Product(name="Samsung Galaxy A55 5G", brand="Samsung", category="tech",
                retail_value=449.00, rarity="rare", client_id="samsung",
                description="AMOLED 120 Hz, IP67, cámara 50 MP.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg"),
        Product(name="Samsung Galaxy Watch 7", brand="Samsung", category="tech",
                retail_value=299.00, rarity="epic", client_id="samsung",
                description="Exynos W1000, BioActive Sensor Plus.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-watch7.jpg"),
        Product(name="Samsung Galaxy Buds 3 Pro", brand="Samsung", category="tech",
                retail_value=249.00, rarity="rare", client_id="samsung",
                description="ANC inteligente, audio 360 Samsung.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-buds3-pro.jpg"),
        Product(name="Samsung Galaxy Tab S9", brand="Samsung", category="tech",
                retail_value=799.00, rarity="epic", client_id="samsung",
                description="AMOLED 11\", S Pen incluido, IP68.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-tab-s9.jpg"),
        Product(name="Samsung Galaxy A15", brand="Samsung", category="tech",
                retail_value=199.00, rarity="uncommon", client_id="samsung",
                description="AMOLED 90 Hz, 50 MP, 5000 mAh.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a15.jpg"),
        Product(name="Cargador Samsung 45W", brand="Samsung", category="accessories",
                retail_value=39.00, rarity="common", client_id="samsung",
                description="Super Fast Charging 2.0 original.",
                image_url="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400"),
        Product(name="Funda Samsung Smart Clear", brand="Samsung", category="accessories",
                retail_value=29.00, rarity="common", client_id="samsung",
                description="Funda oficial transparente Galaxy.",
                image_url="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400"),
    ]

    # ── Products: Realme ────────────────────────────────────────────────────
    realme_products = [
        Product(name="Realme GT 6", brand="Realme", category="tech",
                retail_value=699.00, rarity="legendary", client_id="realme",
                description="Snapdragon 8s Gen 3, carga 120W.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/realme-gt-6.jpg"),
        Product(name="Realme 12 Pro+", brand="Realme", category="tech",
                retail_value=449.00, rarity="epic", client_id="realme",
                description="Periscope 64 MP, diseño cuero.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/realme-12-pro-plus.jpg"),
        Product(name="Realme C67 5G", brand="Realme", category="tech",
                retail_value=249.00, rarity="rare", client_id="realme",
                description="5G accesible, 108 MP, 5000 mAh.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/realme-c67-5g.jpg"),
        Product(name="Realme Watch 3", brand="Realme", category="tech",
                retail_value=79.00, rarity="uncommon", client_id="realme",
                description="GPS, llamadas BT, 110 modos deporte.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/realme-watch-3.jpg"),
        Product(name="Realme Buds Air 5 Pro", brand="Realme", category="tech",
                retail_value=99.00, rarity="uncommon", client_id="realme",
                description="ANC 50 dB, LDAC, 38 h batería.",
                image_url="https://fdn2.gsmarena.com/vv/bigpic/realme-buds-air-5-pro.jpg"),
        Product(name="Cargador Realme DART 65W", brand="Realme", category="accessories",
                retail_value=22.00, rarity="common", client_id="realme",
                description="Carga DART ultrarrápida original.",
                image_url="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400"),
        Product(name="Funda Realme Original", brand="Realme", category="accessories",
                retail_value=12.00, rarity="common", client_id="realme",
                description="Funda oficial silicona.",
                image_url="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400"),
    ]

    # ── Products: Default (mix variado) ────────────────────────────────────
    default_products = [
        Product(name="Sony WH-1000XM5", brand="Sony", category="tech",
                retail_value=349.00, rarity="epic", client_id="default",
                description="Los mejores auriculares con ANC del mercado.",
                image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"),
        Product(name="PlayStation 5 Slim", brand="Sony", category="gaming",
                retail_value=449.00, rarity="legendary", client_id="default",
                description="La consola más potente de Sony.",
                image_url="https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400"),
        Product(name="Nintendo Switch OLED", brand="Nintendo", category="gaming",
                retail_value=349.00, rarity="epic", client_id="default",
                description="Consola híbrida con pantalla OLED.",
                image_url="https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400"),
        Product(name="Apple AirPods Pro 2nd Gen", brand="Apple", category="tech",
                retail_value=249.00, rarity="rare", client_id="default",
                description="ANC adaptativo con chip H2.",
                image_url="https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400"),
        Product(name="Nike Air Max 90", brand="Nike", category="fashion",
                retail_value=120.00, rarity="rare", client_id="default",
                description="El icónico sneaker street style.",
                image_url="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400"),
        Product(name="Logitech G Pro X Superlight 2", brand="Logitech", category="gaming",
                retail_value=159.00, rarity="rare", client_id="default",
                description="Mouse gaming 60g, sensor HERO 2.",
                image_url="https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400"),
        Product(name="Adidas Sport Hoodie", brand="Adidas", category="fashion",
                retail_value=65.00, rarity="uncommon", client_id="default",
                description="Sudadera premium de rendimiento.",
                image_url="https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400"),
        Product(name="Keychron K2 Keyboard", brand="Keychron", category="tech",
                retail_value=89.00, rarity="uncommon", client_id="default",
                description="Teclado mecánico compacto wireless.",
                image_url="https://images.unsplash.com/photo-1561112078-7d24e04c3407?w=400"),
        Product(name="Steam Gift Card $20", brand="Steam", category="gaming",
                retail_value=20.00, rarity="common", client_id="default",
                description="$20 de crédito para Steam.",
                image_url="https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400"),
        Product(name="Funda Universal Premium", brand="Generic", category="accessories",
                retail_value=15.00, rarity="common", client_id="default",
                description="Funda de silicona resistente.",
                image_url="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400"),
        Product(name="Cable USB-C Braided 2m", brand="Generic", category="accessories",
                retail_value=12.00, rarity="common", client_id="default",
                description="Cable trenzado alta resistencia.",
                image_url="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400"),
        Product(name="Llavero Coleccionable", brand="Generic", category="accessories",
                retail_value=5.00, rarity="common", client_id="default",
                description="Llavero de esmalte edición limitada.",
                image_url="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"),
    ]

    all_products = (xiaomi_products + oppo_products + motorola_products +
                    samsung_products + realme_products + default_products)
    for p in all_products:
        db.session.add(p)
    db.session.flush()
    pm = {p.name: p for p in all_products}

    # ── Cajas Xiaomi ────────────────────────────────────────────────────────
    bx1 = Box(name="Caja Xiaomi Starter", price=10.00, category="tech",
              client_id="xiaomi",
              description="Tu primer paso al ecosistema Xiaomi — gadgets reales a precio de caja.",
              image_url="https://images.unsplash.com/photo-1592950630581-03cb41342cc5?w=400")
    db.session.add(bx1); db.session.flush()
    _add_items(bx1, pm, [
        ("Xiaomi 14 Ultra", 1), ("Xiaomi 13T Pro", 3),
        ("Redmi Note 13 Pro+", 8), ("Xiaomi Buds 4 Pro", 20),
        ("Cargador Xiaomi 120W", 80), ("Funda Xiaomi Premium", 88),
    ])

    bx2 = Box(name="Caja Xiaomi Premium", price=30.00, category="tech",
              client_id="xiaomi",
              description="Alta gama Xiaomi — smartphones, wearables y más.",
              image_url="https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=400")
    db.session.add(bx2); db.session.flush()
    _add_items(bx2, pm, [
        ("Xiaomi 14 Ultra", 1), ("Xiaomi 13T Pro", 4),
        ("Redmi Pad SE", 8), ("Xiaomi Mi Watch S3", 15),
        ("Xiaomi Smart Band 8 Pro", 25), ("Cargador Xiaomi 120W", 47),
    ])

    # ── Cajas OPPO ──────────────────────────────────────────────────────────
    bo1 = Box(name="OPPO Sorpresa", price=10.00, category="tech",
              client_id="oppo",
              description="Abre y descubre lo mejor de OPPO.",
              image_url="https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400")
    db.session.add(bo1); db.session.flush()
    _add_items(bo1, pm, [
        ("OPPO Find X7 Ultra", 1), ("OPPO Reno 11 Pro", 4),
        ("OPPO Enco X3", 15), ("OPPO Watch 4 Pro", 10),
        ("Cargador OPPO SUPERVOOC 80W", 70), ("Funda OPPO Original", 100),
    ])

    bo2 = Box(name="OPPO Elite", price=50.00, category="tech",
              client_id="oppo",
              description="Caja elite con los tops de OPPO.",
              image_url="https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=400")
    db.session.add(bo2); db.session.flush()
    _add_items(bo2, pm, [
        ("OPPO Find X7 Ultra", 1), ("OPPO Pad 2", 3),
        ("OPPO Reno 11 Pro", 6), ("OPPO Watch 4 Pro", 12),
        ("OPPO A79 5G", 20), ("Cargador OPPO SUPERVOOC 80W", 58),
    ])

    # ── Cajas Motorola ──────────────────────────────────────────────────────
    bm1 = Box(name="Moto Drop Básico", price=8.00, category="tech",
              client_id="motorola",
              description="Lo clásico de Motorola al mejor precio.",
              image_url="https://images.unsplash.com/photo-1582790949510-9d6d1b8c4c84?w=400")
    db.session.add(bm1); db.session.flush()
    _add_items(bm1, pm, [
        ("Motorola Edge 50 Ultra", 1), ("Moto G84 5G", 10),
        ("Motorola Moto Buds+", 18), ("Moto G14", 40),
        ("Cargador TurboPower 30W Moto", 86), ("Motorola Watch 70", 45),
    ])

    bm2 = Box(name="Moto Edge Premium", price=40.00, category="tech",
              client_id="motorola",
              description="Caja exclusiva de la línea Edge.",
              image_url="https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=400")
    db.session.add(bm2); db.session.flush()
    _add_items(bm2, pm, [
        ("Motorola Edge 50 Ultra", 1), ("Motorola Edge 50 Pro", 4),
        ("Moto G84 5G", 10), ("Motorola Moto Buds+", 18),
        ("Motorola Watch 70", 25), ("Cargador TurboPower 30W Moto", 42),
    ])

    # ── Cajas Samsung ───────────────────────────────────────────────────────
    bs1 = Box(name="Galaxy Box Starter", price=12.00, category="tech",
              client_id="samsung",
              description="Entra al universo Galaxy desde $12.",
              image_url="https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400")
    db.session.add(bs1); db.session.flush()
    _add_items(bs1, pm, [
        ("Samsung Galaxy S24 Ultra", 1), ("Samsung Galaxy S24+", 3),
        ("Samsung Galaxy A55 5G", 10), ("Samsung Galaxy Buds 3 Pro", 18),
        ("Cargador Samsung 45W", 70), ("Funda Samsung Smart Clear", 98),
    ])

    bs2 = Box(name="Galaxy Box Ultra", price=60.00, category="tech",
              client_id="samsung",
              description="La experiencia Galaxy en su máxima expresión.",
              image_url="https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=400")
    db.session.add(bs2); db.session.flush()
    _add_items(bs2, pm, [
        ("Samsung Galaxy S24 Ultra", 2), ("Samsung Galaxy Tab S9", 4),
        ("Samsung Galaxy Watch 7", 8), ("Samsung Galaxy Buds 3 Pro", 12),
        ("Samsung Galaxy A55 5G", 20), ("Cargador Samsung 45W", 54),
    ])

    # ── Cajas Realme ────────────────────────────────────────────────────────
    br1 = Box(name="Realme Power Box", price=9.00, category="tech",
              client_id="realme",
              description="Potencia Realme — gadgets a precio de locura.",
              image_url="https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=400")
    db.session.add(br1); db.session.flush()
    _add_items(br1, pm, [
        ("Realme GT 6", 1), ("Realme 12 Pro+", 5),
        ("Realme C67 5G", 12), ("Realme Buds Air 5 Pro", 25),
        ("Cargador Realme DART 65W", 80), ("Funda Realme Original", 77),
    ])

    # ── Cajas Default (multi-marca) ─────────────────────────────────────────
    bd1 = Box(name="Tech Starter", price=10.00, category="tech",
              client_id="default",
              description="Tecnología premium — con posibilidades de gadgets top.",
              image_url="https://images.unsplash.com/photo-1518770660439-4636190af475?w=400")
    db.session.add(bd1); db.session.flush()
    _add_items(bd1, pm, [
        ("Sony WH-1000XM5", 2), ("Apple AirPods Pro 2nd Gen", 6),
        ("Keychron K2 Keyboard", 18), ("Adidas Sport Hoodie", 30),
        ("Cable USB-C Braided 2m", 90), ("Llavero Coleccionable", 54),
    ])

    bd2 = Box(name="Gaming Paradise", price=25.00, category="gaming",
              client_id="default",
              description="Todo lo que un gamer serio podría querer.",
              image_url="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400")
    db.session.add(bd2); db.session.flush()
    _add_items(bd2, pm, [
        ("PlayStation 5 Slim", 1), ("Nintendo Switch OLED", 3),
        ("Logitech G Pro X Superlight 2", 10), ("Steam Gift Card $20", 60),
        ("Cable USB-C Braided 2m", 76), ("Llavero Coleccionable", 50),
    ])

    bd3 = Box(name="Fashion Drop", price=20.00, category="fashion",
              client_id="default",
              description="Streetwear y moda premium — prendas frescas cada apertura.",
              image_url="https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400")
    db.session.add(bd3); db.session.flush()
    _add_items(bd3, pm, [
        ("Nike Air Max 90", 10), ("Adidas Sport Hoodie", 25),
        ("Keychron K2 Keyboard", 15), ("Llavero Coleccionable", 150),
    ])

    # ── Super admin ─────────────────────────────────────────────────────────
    if not User.query.filter_by(email='admin@mysteryboxes.com').first():
        admin = User(username='admin', email='admin@mysteryboxes.com', role='super_admin')
        admin.set_password('Admin123!')
        db.session.add(admin)
        db.session.flush()
        db.session.add(Wallet(user_id=admin.id))
        db.session.flush()
        ProvablyFairService.create_seed_pair(admin.id)

    db.session.commit()
    print("[seed] Demo data loaded.")
    print("  Super admin: admin@mysteryboxes.com / Admin123!")
    print("  Providers:   xiaomi, oppo, motorola, samsung, realme, default")
