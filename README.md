# MOVIE_DNA: Content-Based Movie Recommender & Interactive Web UI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https.mit-license.org)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-cyan.svg)](#interactive-web-ui)

## 📌 Aim
The goal of this project is to build an intelligent recommendation engine that predicts a user's movie preferences by analyzing the **"DNA"** of films they already like. Unlike traditional systems that rely on what *other* people watch (Collaborative Filtering), this system focuses entirely on the **content** (plots, themes, and genres) of the movies themselves.

---

## 🧬 Core Concepts & Algorithms

1. **TF-IDF Vectorization (Term Frequency - Inverse Document Frequency):**
   Converts movie descriptions and genre metadata into high-dimensional numerical vectors, weighting rare, informative plot keywords higher than common stop words.
2. **Cosine Similarity:**
   Measures the mathematical distance (angle) between movie feature vectors to find titles with the highest content correlation.
3. **Feature Blending (Ideal Taste Profile):**
   Averages vectors of multiple user-selected favorite movies into a single unified vector signature representing the user's "Movie DNA".

---

## 🌐 Interactive Web Application UI

A futuristic, high-performance web interface is built directly into this repository (`index.html`).

### Features:
- 🧪 **Live Client-side NLP Engine:** Native JavaScript implementation of TF-IDF vectorization and Cosine Similarity matching for zero-latency instant recommendations.
- 🎨 **Futuristic Cinematic UI:** Dark theme with glassmorphic cards, glowing cyan/magenta accents, and smooth micro-animations.
- 🔍 **Instant Search & Autocomplete:** Real-time search across curated popular films or TMDB API live trending lists.
- 📊 **Movie DNA Analytics:** Displays top extracted TF-IDF plot keywords with weightings and genre breakdown charts.
- 🎯 **Match Percentage Badges:** Shows exact % DNA match score (e.g. `96% MATCH`) and shared plot keywords for every recommendation.
- 💾 **Export Taste Profile:** Download your customized taste profile report as a JSON file.

### How to Run locally:
Open `index.html` directly in any web browser, or serve it using Python:

```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

---

## 🐍 Python Jupyter Notebook Usage

The original Python pipeline is available in [`MovieDNA.ipynb`](file:///c:/Users/karth/Documents/antigravity/hopeful-einstein/MovieDNA.ipynb):

```python
import requests as r
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Example Usage:
my_likes = ["Avatar", "The Batman", "Inception"]
recommend_expert(my_likes)
```

---

## 📄 License
This project is licensed under the **MIT License** - feel free to use and modify it for your own learning!
