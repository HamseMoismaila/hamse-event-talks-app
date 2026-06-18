# BigQuery Release Pulse

**BigQuery Release Pulse** is a Flask-powered web application that tracks, aggregates, and visualizes Google Cloud BigQuery release notes in real time. It automatically scrapes Google's official feed, cleans the raw XML/HTML data, categorizes updates, and provides a polished glassmorphic UI to explore the updates. It also includes an integrated Tweet Composer to quickly draft and share updates directly to Twitter.

---

## 🚀 Key Features

* **Real-Time Feed Integration**: Pulls live data from the official Google Cloud BigQuery Release Notes RSS/Atom feed.
* **Smart Feed Splitting**: Google bundles daily releases under single entries. The app splits these into individual, stand-alone updates.
* **Automatic Categorization**: Groups release updates into **Features**, **Announcements**, **Deprecations**, or **Others** based on content headers.
* **Performance-First Caching**: Implements a 5-minute in-memory cache on the server side to minimize external network requests and prevent rate-limiting issues.
* **Resiliency Fallbacks**: If the external feed is offline or unreachable, the server automatically serves cached records.
* **Interactive Client Controls**: Fully client-side search indexing and live filter tabs.
* **Tweet Composer Drawer**: Slide-out panel that compiles draft status updates with formatted emojis, titles, descriptions, and docs links. Features a live character counter matching Twitter's 23-character URL standard.

---

## 🛠️ Tech Stack

* **Server-Side**: Python, [Flask](https://flask.palletsprojects.com/) (Routing, RSS Retrieval, Caching, XML Parsing, HTML sanitization).
* **Client-Side**: Vanilla JavaScript (State management, client search, DOM mutations), HTML5 semantic layout.
* **Styling**: Vanilla CSS (Premium glassmorphic dashboard, responsive layout, glows, and transitions).
* **Icons**: [Lucide Icons](https://lucide.dev/).

---

## 📂 Project Structure

```
├── app.py                  # Flask main entry, caching & custom parsers
├── requirements.txt        # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css       # Core design styles (glassmorphism, animations)
│   └── js/
│       └── app.js          # Core frontend controller and event listeners
└── templates/
    └── index.html          # Main Single-Page dashboard layout
```

---

## ⚙️ Installation & Setup

### Prerequisites
Make sure you have **Python 3.8+** installed.

### 1. Clone the repository and navigate to the directory
```bash
cd agy-cli-projects
```

### 2. Set up a virtual environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the application
```bash
python app.py
```
The application will run locally at `http://127.0.0.1:5000/`.

---

## 🔌 API Reference

### Get Release Notes
* **Endpoint**: `/api/release-notes`
* **Method**: `GET`
* **Query Parameters**:
  * `refresh` (optional): Set to `true` to bypass cache and force pull latest updates from Google's feed. Example: `/api/release-notes?refresh=true`.
* **Sample JSON Response**:
```json
{
  "source": "network",
  "last_updated": 1781878473.0,
  "updates": [
    {
      "id": "tag:google.com,2026:bigquery-release-notes-20260617_0",
      "date": "June 17, 2026",
      "updated": "2026-06-17T00:00:00Z",
      "type": "Feature",
      "content_html": "<p>You can now use vector search functions directly...</p>",
      "content_text": "You can now use vector search functions directly...",
      "link": "https://cloud.google.com/bigquery/docs/release-notes"
    }
  ]
}
```

---

## 📜 License
This project is open-source and available under the MIT License.
