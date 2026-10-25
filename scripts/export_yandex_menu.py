#!/usr/bin/env python3
"""Export the restaurant's public menu; Python 3 standard library only."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://eda.yandex.ru/r/xorovac?placeSlug=xorovac_wbm8q"
API = "https://eda.yandex.ru/api/v2/menu/retrieve/xorovac_wbm8q"


def fetch(url):
    with urlopen(Request(url, headers={"User-Agent": "Horovatz menu export"}), timeout=45) as response:
        return response.read()


def export(raw):
    categories, dishes, seen = [], [], set()
    for category in raw["payload"]["categories"]:
        # The popularity selection repeats dishes from their real categories.
        if not category.get("id"):
            continue
        category_id = "ya-" + str(category["id"])
        categories.append({"id": category_id, "title": category["name"].strip(),
                           "subtitle": "", "icon": "", "available": category["available"]})
        for item in category["items"]:
            dish_id = "ya-" + str(item["id"])
            if dish_id in seen:
                raise ValueError("Duplicate dish: " + dish_id)
            seen.add(dish_id)
            # Integer promoPrice is rounded by Yandex; decimal fields are exact.
            price = Decimal(item["decimalPrice"])
            promo = Decimal(item.get("decimalPromoPrice") or item["decimalPrice"])
            if price <= 0 or promo <= 0:
                raise ValueError("Invalid price: " + dish_id)
            uri = (item.get("picture") or {}).get("uri", "")
            image = "https://eda.yandex" + uri if uri.startswith("/") else uri
            image = image.replace("{w}", "400").replace("{h}", "400nocrop")
            dishes.append({
                "id": dish_id, "title": item["name"].strip(),
                "description": item.get("description", "").strip(),
                "price": float(price), "promoPrice": float(promo),
                "weight": item.get("weight", "").replace("\u00a0", " ").strip(),
                "categoryId": category_id,
                "imageUrl": f"/images/menu/xorovac/{dish_id}.jpeg" if image else "",
                "sourceImageUrl": image, "ingredients": "",
                "available": bool(category["available"] and item["available"]),
                "optionsGroups": item.get("optionsGroups", []),
            })
    if not categories or not dishes:
        raise ValueError("Empty menu: source format may have changed")
    return {"sourceUrl": SOURCE, "sourceApi": API,
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "sourceSha256": hashlib.sha256(json.dumps(raw, sort_keys=True).encode()).hexdigest(),
            "categories": categories, "dishes": dishes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-file", type=Path, help="Use a previously downloaded API JSON")
    parser.add_argument("--skip-images", action="store_true")
    args = parser.parse_args()
    raw = json.loads(args.source_file.read_text() if args.source_file else fetch(API))
    menu = export(raw)
    if not args.skip_images:
        image_dir = ROOT / "horovats/public/images/menu/xorovac"
        image_dir.mkdir(parents=True, exist_ok=True)

        def download(dish):
            if not dish["sourceImageUrl"]:
                return
            data = fetch(dish["sourceImageUrl"])
            if not data.startswith(b"\xff\xd8\xff"):
                raise ValueError("Expected JPEG: " + dish["id"])
            (image_dir / (dish["id"] + ".jpeg")).write_bytes(data)

        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(download, menu["dishes"]))
    target = ROOT / "horovats-backend/internal/menuimport/data/xorovac.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(menu, ensure_ascii=False, indent=2) + "\n")
    print(f"Exported {len(menu['categories'])} categories, {len(menu['dishes'])} dishes; "
          f"{sum(d['available'] for d in menu['dishes'])} available")


if __name__ == "__main__":
    main()
