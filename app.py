from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
import re
import time
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
CACHE_DURATION_SECONDS = 300  # Cache for 5 minutes
_cache = {
    "data": None,
    "last_updated": 0
}

class ReleaseNotesParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current_type = None
        self.current_content = []
        self.updates = []

    def handle_starttag(self, tag, attrs):
        if tag == "h3":
            self.save_current_update()
            self.current_type = ""
            self.current_content = []
        else:
            if self.current_type is None:
                self.current_type = "Update"
            start_tag = self.get_starttag_text()
            if start_tag:
                self.current_content.append(start_tag)

    def handle_endtag(self, tag):
        if tag == "h3":
            pass
        else:
            self.current_content.append(f"</{tag}>")

    def handle_data(self, data):
        if self.current_type == "":
            self.current_type = data.strip()
        else:
            if self.current_type is None:
                self.current_type = "Update"
            self.current_content.append(data)

    def save_current_update(self):
        if self.current_type is not None:
            content_html = "".join(self.current_content).strip()
            # If content is empty and type is empty, don't save
            if not self.current_type and not content_html:
                return
            
            self.updates.append({
                "type": self.current_type or "Update",
                "content_html": content_html,
                "content_text": self.clean_html(content_html)
            })
            self.current_type = None
            self.current_content = []

    def clean_html(self, raw_html):
        # Remove HTML tags
        clean = re.sub(r'<.*?>', '', raw_html)
        # Normalize whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    def parse_content(self, html):
        self.feed(html)
        self.save_current_update()
        res = self.updates
        self.updates = []
        return res

def fetch_and_parse_feed():
    try:
        logger.info(f"Fetching feed from {FEED_URL}...")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        xml_data = response.content
        root = ET.fromstring(xml_data)
        
        # Atom Namespace
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        parsed_updates = []
        
        for entry in root.findall("atom:entry", ns):
            date_str = entry.find("atom:title", ns).text
            updated_iso = entry.find("atom:updated", ns).text
            id_str = entry.find("atom:id", ns).text
            
            # Extract link
            link_el = entry.find("atom:link", ns)
            link_str = link_el.get("href") if link_el is not None else ""
            
            # Extract content HTML
            content_el = entry.find("atom:content", ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Parse sub-updates inside the entry
            parser = ReleaseNotesParser()
            sub_updates = parser.parse_content(content_html)
            
            for idx, update in enumerate(sub_updates):
                parsed_updates.append({
                    "id": f"{id_str}_{idx}",
                    "date": date_str,
                    "updated": updated_iso,
                    "type": update["type"],
                    "content_html": update["content_html"],
                    "content_text": update["content_text"],
                    "link": link_str or "https://cloud.google.com/bigquery/docs/release-notes"
                })
        
        logger.info(f"Successfully parsed {len(parsed_updates)} updates.")
        return parsed_updates
        
    except Exception as e:
        logger.error(f"Error fetching/parsing feed: {e}")
        raise

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Check cache
    if not force_refresh and _cache["data"] is not None and (current_time - _cache["last_updated"] < CACHE_DURATION_SECONDS):
        logger.info("Serving release notes from cache.")
        return jsonify({
            "source": "cache",
            "last_updated": _cache["last_updated"],
            "updates": _cache["data"]
        })
        
    try:
        updates = fetch_and_parse_feed()
        _cache["data"] = updates
        _cache["last_updated"] = current_time
        return jsonify({
            "source": "network",
            "last_updated": current_time,
            "updates": updates
        })
    except Exception as e:
        # Fallback to cache if request fails
        if _cache["data"] is not None:
            logger.warning("Network request failed. Falling back to cached data.")
            return jsonify({
                "source": "fallback_cache",
                "last_updated": _cache["last_updated"],
                "updates": _cache["data"],
                "error": str(e)
            }), 200
        
        return jsonify({
            "error": "Failed to fetch release notes and no cached data available.",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
