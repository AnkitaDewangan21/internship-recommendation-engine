import os
from flask import Flask, render_template, request, jsonify

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# -----------------------------
# Flask app setup
# -----------------------------
app = Flask(__name__)

# -----------------------------
# Load internship data from CSV
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "internships.csv")

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(
        f"internships.csv not found at {DATA_PATH}. "
        f"Create data/internships.csv with the required columns."
    )

internships_df = pd.read_csv(DATA_PATH)  # [web:139]

# Basic validation of required columns
required_cols = [
    "id",
    "title",
    "organization",
    "domain",
    "location",
    "mode",
    "duration_weeks",
    "required_skills",
    "description",
    "eligibility_level",
]
missing = [c for c in required_cols if c not in internships_df.columns]
if missing:
    raise ValueError(f"Missing required columns in internships.csv: {missing}")

# Ensure correct types
internships_df["duration_weeks"] = internships_df["duration_weeks"].fillna(0)

# -----------------------------
# Build ML model (TF‑IDF + cosine similarity)
# -----------------------------

# Combine text features into a single field per internship
def build_corpus(df: pd.DataFrame) -> pd.Series:
    # Merge domain, skills, description into one text string per row
    combined = (
        df["domain"].fillna("") + " | " +
        df["required_skills"].fillna("") + " | " +
        df["description"].fillna("")
    )
    return combined.str.lower()

corpus = build_corpus(internships_df)

# TF‑IDF vectorizer on internship text (domain + skills + description)
vectorizer = TfidfVectorizer(stop_words="english")  # [web:133][web:139]
internships_tfidf = vectorizer.fit_transform(corpus)

print(f"[INFO] Loaded {len(internships_df)} internships and built TF‑IDF matrix.")


# -----------------------------
# Helper: convert DataFrame row to dict for JSON
# -----------------------------
def row_to_dict(row: pd.Series, score: float) -> dict:
    return {
        "id": int(row["id"]),
        "title": row["title"],
        "organization": row["organization"],
        "domain": row["domain"],
        "location": row["location"],
        "mode": row["mode"],
        "duration_weeks": int(row["duration_weeks"]),
        "required_skills": str(row["required_skills"]).split(";"),
        "description": row["description"],
        "eligibility_level": row["eligibility_level"],
        # "score": round(float(score), 2),
    }


# -----------------------------
# ML‑based recommendation logic
# -----------------------------
def build_user_query_text(user_data: dict) -> str:
    """
    Turn user input into a text string compatible with the TF‑IDF model.
    It merges skills, preferred_domain, discipline, and some keywords.
    """
    skills = user_data.get("skills", "")
    preferred_domain = user_data.get("preferred_domain", "")
    discipline = user_data.get("discipline", "")
    academic_level = user_data.get("academic_level", "")

    parts = [
        preferred_domain,
        discipline,
        academic_level,
        skills,
    ]
    # Filter empty strings, lower case
    text = " | ".join([p for p in parts if p]).lower()
    return text


def ml_recommendations(user_data: dict, top_k: int = 5) -> list:
    user_text = build_user_query_text(user_data)
    if not user_text.strip():
        return []

    user_vec = vectorizer.transform([user_text])
    similarities = cosine_similarity(user_vec, internships_tfidf).flatten()

    # Start from similarity score
    weights = similarities.copy()

    pref_location = user_data.get("preferred_location", "").strip().lower()
    pref_mode = user_data.get("internship_type", "").strip()
    pref_level = user_data.get("academic_level", "").strip()
    pref_domain = user_data.get("preferred_domain", "").strip().lower()

    user_skills = [
        s.strip().lower() for s in user_data.get("skills", "").split(",") if s.strip()
    ]

    for idx, row in internships_df.iterrows():
        loc = str(row["location"]).strip().lower()
        mode = str(row["mode"]).strip()
        level = str(row["eligibility_level"]).strip()
        domain = str(row["domain"]).strip().lower()
        row_skills = [s.strip().lower() for s in str(row["required_skills"]).split(";") if s.strip()]

        # 1) Domain exact match – strong boost
        if pref_domain and pref_domain == domain:
            weights[idx] += 0.4

        # 2) Skill overlap – +0.08 per matching skill
        skill_matches = sum(1 for s in user_skills if s in row_skills)
        weights[idx] += 0.08 * skill_matches

        # 3) Location
        if pref_location and pref_location == loc:
            weights[idx] += 0.25          # exact city
        elif "remote" in loc or "online" in mode.lower():
            weights[idx] += 0.1           # remote friendly

        # 4) Mode
        if pref_mode and pref_mode == mode:
            weights[idx] += 0.25

        # 5) Academic level
        if pref_level and pref_level == level:
            weights[idx] += 0.25

    top_indices = np.argsort(weights)[::-1][:top_k]

    results = []
    for idx in top_indices:
        if weights[idx] <= 0:
            continue
        row = internships_df.iloc[idx]
        results.append(row_to_dict(row, weights[idx]))

    return results

# -----------------------------
# Routes
# -----------------------------
@app.route("/", methods=["GET"])
def index():
    # Uses the existing templates/index.html
    return render_template("index.html")


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json(force=True) or {}

    # Basic server‑side validation
    required_fields = [
        "name",
        "email",
        "academic_level",
        "discipline",
        "skills",
        "preferred_domain",
        "preferred_location",
        "internship_type",
        "duration_preference",
    ]
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return jsonify(
            {
                "status": "error",
                "message": f"Missing required fields: {', '.join(missing)}",
            }
        ), 400

    # Call ML recommender
    recs = ml_recommendations(data, top_k=5)

    if not recs:
        return jsonify(
            {
                "status": "success",
                "recommendations": [],
                "message": "No strong matches found. Please broaden your skills/domain or change preferences.",
            }
        )

    return jsonify(
        {
            "status": "success",
            "recommendations": recs,
            "message": f"Found {len(recs)} matching internship(s)!",
        }
    )


# -----------------------------
# Entry point
# -----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)