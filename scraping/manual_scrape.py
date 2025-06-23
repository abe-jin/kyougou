import argparse
from scheduler import scrape_product, load_products
from env_loader import load_env

load_env()
from backup import auto_backup
auto_backup()


def main(index: int):
    products = load_products()
    if index < 0 or index >= len(products):
        return
    scrape_product(index)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--index', type=int, required=True)
    args = parser.parse_args()
    main(args.index)