import os
import sys
import re
import urllib.request
import urllib.parse
import unicodedata
from urllib.error import URLError, HTTPError

# Reconfigure stdout to use UTF-8 to prevent any Windows console encodings from failing on Czech diacritics
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Try to import requests and BeautifulSoup, install them if not available
try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages (requests, beautifulsoup4)...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4"])
    import requests
    from bs4 import BeautifulSoup

BASE_URL = "https://ridgebackragnar.cz"
TARGET_DIR = r"C:\Users\radek\Desktop\ridgebackragnar"
PAGES_DIR = os.path.join(TARGET_DIR, "pages")
IMAGES_DIR = os.path.join(TARGET_DIR, "images")

# Ensure target directories exist
os.makedirs(PAGES_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# Set of visited URLs (using the fully normalized and quoted fetch URLs)
visited_urls = set()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def sanitize_filename(name):
    # Normalize to NFC and decode percent encoding if any
    name = urllib.parse.unquote(name)
    name = unicodedata.normalize('NFC', name)
    name = name.strip().lower()
    
    if name == "úvodní stránka" or name == "":
        return "index"
        
    # Czech character replacement (diacritics removal)
    czech_replace = {
        'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n',
        'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z'
    }
    for k, v in czech_replace.items():
        name = name.replace(k, v)
        
    name = re.sub(r'[^a-z0-9_\-\./]', '_', name)
    name = name.strip('_/')
    if not name or name == "":
        name = "index"
    return name

def get_full_url_for_fetching(url, current_page_url=None):
    if not url:
        return None
    url = url.strip()
    if url.startswith("javascript:") or url.startswith("mailto:") or url.startswith("tel:"):
        return None
    if url.startswith("#"):
        return None
    
    # Resolve relative URLs
    if current_page_url:
        full_url = urllib.parse.urljoin(current_page_url, url)
    else:
        full_url = urllib.parse.urljoin(BASE_URL, url)
        
    # Parse and validate domain
    parsed = urllib.parse.urlparse(full_url)
    if parsed.netloc not in ["ridgebackragnar.cz", "www.ridgebackragnar.cz", ""]:
        return None
        
    # Standardize the path to NFC and quote it properly to prevent 404s on diacritics
    # Unquote first to prevent double percent-encoding
    unquoted_path = urllib.parse.unquote(parsed.path)
    nfc_path = unicodedata.normalize('NFC', unquoted_path)
    quoted_path = urllib.parse.quote(nfc_path)
    
    # Reassemble standard clean URL for fetching
    return urllib.parse.urlunparse((
        parsed.scheme or "https",
        "ridgebackragnar.cz",
        quoted_path,
        parsed.params,
        parsed.query,
        ''
    ))

def download_image(img_url, referrer_url):
    full_img_url = get_full_url_for_fetching(img_url, referrer_url) or img_url
    if not full_img_url.startswith("http"):
        if img_url.startswith("/"):
            full_img_url = BASE_URL + img_url
        else:
            return img_url

    parsed_url = urllib.parse.urlparse(full_img_url)
    path_parts = parsed_url.path.strip('/').split('/')
    if not path_parts or path_parts[-1] == "":
        return img_url
        
    img_name = urllib.parse.unquote(path_parts[-1])
    img_name = unicodedata.normalize('NFC', img_name)
    
    # Add unique identifier for duplicate or generic names
    if len(path_parts) > 1 and img_name.lower() in ["image.jpg", "image.png", "image.webp", "logo.jpg", "logo.png"]:
        img_name = f"{path_parts[-2]}_{img_name}"
        
    # Sanitize image filename (leaving periods, dashes, and underscores)
    img_name = sanitize_filename(os.path.splitext(img_name)[0]) + os.path.splitext(img_name)[1]
    local_path = os.path.join(IMAGES_DIR, img_name)
    
    # Download
    if os.path.exists(local_path):
        print(f"Image already exists, skipping download: {img_name}")
        return f"../images/{img_name}"
        
    try:
        print(f"Downloading image: {full_img_url} -> {local_path}")
        response = requests.get(full_img_url, headers=headers, timeout=15)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                f.write(response.content)
            return f"../images/{img_name}"
        else:
            print(f"Failed to download image {full_img_url}: Status code {response.status_code}")
    except Exception as e:
        print(f"Error downloading image {full_img_url}: {e}")
        
    return img_url

def extract_text_and_structure(soup):
    md_content = []
    
    title = soup.title.string if soup.title else ""
    if title:
        md_content.append(f"# {title.strip()}\n")
        
    visited_elements = set()
    
    for block in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "img", "li", "blockquote"]):
        if block in visited_elements:
            continue
        visited_elements.add(block)
        
        name = block.name
        text = block.get_text().strip()
        
        if name.startswith("h") and text:
            level = int(name[1])
            md_content.append(f"{'#' * level} {text}\n")
        elif name == "p" and text:
            inner_links = block.find_all("a")
            p_text = text
            for a in inner_links:
                href = a.get("href")
                a_text = a.get_text().strip()
                if href and a_text:
                    p_text = p_text.replace(a_text, f"[{a_text}]({href})")
            md_content.append(f"{p_text}\n")
        elif name == "blockquote" and text:
            md_content.append(f"> {text}\n")
        elif name == "img":
            src = block.get("src")
            alt = block.get("alt", "Image")
            if src:
                md_content.append(f"![{alt}]({src})\n")
        elif name == "li" and text:
            md_content.append(f"- {text}")
            
    return "\n".join(md_content)

def crawl_and_scrape(url):
    full_url = get_full_url_for_fetching(url)
    if not full_url or full_url in visited_urls:
        return
        
    visited_urls.add(full_url)
    print(f"\n--- Crawling page: {full_url} ---")
    
    try:
        response = requests.get(full_url, headers=headers, timeout=15)
        response.encoding = 'utf-8'
        if response.status_code != 200:
            print(f"Failed to fetch {full_url}: {response.status_code}")
            return
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Determine clean filename for local saving
        parsed_url = urllib.parse.urlparse(full_url)
        path_name = parsed_url.path.strip('/')
        if not path_name:
            filename_base = "index"
        else:
            filename_base = sanitize_filename(path_name)
            
        html_filename = f"{filename_base}.html"
        md_filename = f"{filename_base}.md"
        
        html_path = os.path.join(PAGES_DIR, html_filename)
        md_path = os.path.join(PAGES_DIR, md_filename)
        
        print(f"Saving to {html_path} and {md_path}")
        
        # Process and download all images
        for img in soup.find_all("img"):
            src = img.get("src")
            if src:
                local_src = download_image(src, full_url)
                img["src"] = local_src
                
        for source in soup.find_all("source"):
            srcset = source.get("srcset")
            if srcset:
                urls = [u.strip().split(' ')[0] for u in srcset.split(',')]
                if urls:
                    local_src = download_image(urls[0], full_url)
                    source["srcset"] = local_src

        # Find more links on this page to crawl
        links_to_crawl = []
        for a in soup.find_all("a"):
            href = a.get("href")
            link_full_url = get_full_url_for_fetching(href, full_url)
            if link_full_url:
                links_to_crawl.append(link_full_url)
                # Rewrite href to local filename for offline browsing
                parsed_link = urllib.parse.urlparse(link_full_url)
                link_path_name = parsed_link.path.strip('/')
                if not link_path_name:
                    local_href = "index.html"
                else:
                    local_href = f"{sanitize_filename(link_path_name)}.html"
                a["href"] = local_href

        # Write clean markdown representation
        md_text = extract_text_and_structure(soup)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(f"Source URL: {full_url}\n\n")
            f.write(md_text)
            
        # Write modified, offline-ready HTML
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
            
        # Recurse on other discovered links
        for link in links_to_crawl:
            crawl_and_scrape(link)
            
    except Exception as e:
        print(f"Error crawling {full_url}: {e}")

if __name__ == "__main__":
    print(f"Starting scrape of {BASE_URL}...")
    crawl_and_scrape(BASE_URL)
    print("\nScraping complete!")
    print(f"Pages saved in: {PAGES_DIR}")
    print(f"Images saved in: {IMAGES_DIR}")
