# SMART TRAFFIC AND ENFORCEMENT SYSTEM

This is a mini-hackathon (ideathon) project for managing traffic congestion in a city. It uses a simulated traffic system with accurate traffic light locations within a city (via OpenStreetMap API) and AI-powered congestion prediction.

## Features

- **Live Geospatial Mapping**: Fetches and renders real-world traffic signal coordinates via the OpenStreetMap (Overpass) API on an interactive Leaflet map.
- **Generative AI Incident Simulation**: Autonomously hallucinates and generates realistic, location-specific traffic incidents every 30-60 seconds using the Google Gemini 3.1 Flash-Lite API.
- **Real-time Traffic Simulation**: Continuously simulates traffic flow, congestion levels, and adaptive traffic light timings across hundreds of intersections.
- **Interactive Incident Management**: Users can manually report traffic accidents, and verify/dismiss AI-generated incidents directly from the map.
- **Dynamic Overlap Resolution**: Custom spatial algorithm to cleanly handle dense, overlapping map markers with an elegant selection menu.
- **Emergency Vehicle Handling**: Simulates ambulance prioritization by dynamically altering traffic light states to clear lanes during emergencies.
- **Modern UI & Dockerized**: Features a clean, responsive interface and is fully containerized (Frontend, Backend, MongoDB) for one-click deployment.

## How to Run

1. Clone this repo
    ```bash
    git clone https://github.com/RealNath/smart-city-mobility.git
    ```

2. Copy the .env.example file to .env
    ```bash
    cp .env.example .env
    ```

3. Generate a Gemini API key via https://aistudio.google.com/app/api-keys and replace `your-gemini-api-key-here` with the copied API key.

4. Run the app
    ```bash
    docker compose up
    ```

5. Visit http://localhost:80/

## Hackathon Members
* Adam Farhan (Universiti Malaya)
* Jonathan Levi (Institut Teknologi Bandung)
* Maisara Kamarul Baharin (Universiti Malaya)
* Michelle (Institut Teknologi Bandung)
* Nizzah Najlah (Universiti Malaya)