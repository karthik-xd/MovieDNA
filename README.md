MOVIE_DNA: Content-Based Movie Recommender

Aim
The goal of this project is to build an intelligent recommendation engine that predicts a user's movie preferences by analyzing the "DNA" of films they already like. Unlike traditional systems that rely on what *other* people watch, this system focuses entirely on the **content** (plots, themes, and genres) of the movies themselves.

Subjects & Technologies Used
To build this engine, we utilized several core concepts from **Data Science** and **Natural Language Processing (NLP)**:

*) **Python 3.11:** The core programming language.
*) **Pandas:** Used for data cleaning, handling missing values, and managing the trending movie dataset.
*) **TF-IDF Vectorization:** A mathematical technique that converts movie descriptions into numerical vectors by weighing the importance of unique keywords.
*) **Cosine Similarity:** The primary "matching" algorithm that measures the distance between movie vectors to find the most similar titles.
*) **Regex (Regular Expressions):** Used to clean data by removing symbols and hashtags, ensuring the model isn't confused by "noise."
*) **Feature Blending:** A custom logic that averages multiple user inputs to create a single "Ideal Taste Profile."



Why We Used This Approach
We chose Content-Based Filtering for several specific reasons:

1.  No "Cold Start" Problem: Many systems need thousands of user ratings to work (Collaborative Filtering). Our system works instantly—as long as we have the         movie description, we can recommend it.
2.  pecific to You: Recommendations are based strictly on the items you liked, making it very effective for niche tastes.
3.  Transparency: It is easy to explain *why* a movie was recommended (e.g., "Both movies involve space travel and the Action genre").
4.  Efficiency: Using **Cosine Similarity** allows the system to compare your favorite movie against hundreds of others in milliseconds, making it fast and scalable.



How to Use
1. **Prepare your data:** Ensure your CSV or API data is loaded into a Pandas DataFrame.
2. **Input your favorites:** Pass a list of movies you enjoy into the `recommend_expert()` function.
3. **Get Results:** The system will output the **Top 6** most mathematically similar movies from the trending list.

python
# Example Usage:
my_likes = ["Avatar", "The Batman", "Inception"]
recommend_expert(my_likes)



License
This project is licensed under the **MIT License** - feel free to use and modify it for your own learning!
