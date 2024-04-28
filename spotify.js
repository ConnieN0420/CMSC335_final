const express = require('express');
const app = express();
const ejs = require('ejs');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const path = require("path");
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(express.static("public"));

require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') });
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.ysmusgo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
const {MongoClient, ServerApiVersion} = require('mongodb');



//////////GET RID OF ONCE HOST ON ANOTHER SERVER
const portNumber = 5001;






async function getRecentSearchesFromDatabase() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
  try {
      await client.connect();
      const recentSearches = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).find().sort({ _id: -1 }).limit(10).toArray();
      return recentSearches;
  } catch (error) {
      console.error(error);
  } finally {
      await client.close();
  }
}



//render hope page (display DataBase Findings on main page?)
app.get('/', async (request, response) => {
  try {
    const recentSearches = await getRecentSearchesFromDatabase();
    response.render('index', { recentSearches });
  } catch (error) {
      console.error(error);
  }
    //response.render('index');
});

//clear search history 
app.post('/', async (request, response) => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).deleteMany({});
    await client.close();    
    response.redirect('/');
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
});


//Rendering the page for track search and results
app.get('/track', async (request, response) => {
    response.render('track'); 
});

app.post('/track', async (request, response) => {
    const trackSearch = request.body.trackSearch; 

    const options = {
        method: 'GET',
        url: 'https://spotify23.p.rapidapi.com/search/',
        params: {
          q: String(trackSearch),
          type: 'tracks',
          offset: '0',
          limit: '5',
          numberOfTopResults: '5'
        },
        //0f94e830b4msh8a689590674fe59p1bd2cfjsn5b97f02b0254
        //
        headers: {
          'X-RapidAPI-Key': 'd8e92cdc8cmsha8be612abb92cd7p1612b7jsn8651a2069889',
          'X-RapidAPI-Host': 'spotify23.p.rapidapi.com'
        }
      };

      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
      try {
          await client.connect();
          const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne({ 'type': 'tracks', 'query': trackSearch });
      } catch (e) {
          console.error(e);
      } finally {
          await client.close();
      }
    
    try {
        const tracks_data = await axios.request(options);
        let results = `<div class = "results"> Track Search Results: <br><br>`;
        for (let item of tracks_data.data.tracks.items) {
            const track = item.data;
            results += `<div class = "info-container" >`
            results += `<div class = "info-tracks">Track: ${track.name} <br>`;
            results += `Album: ${track.albumOfTrack.name}<br>`;
            results += `Artists: ${track.artists.items.map(artist => artist.profile.name).join(', ')}<br>`;
            results += `</div>`;
            if (track.albumOfTrack.coverArt.sources.length > 0) {
              const imageUrl = track.albumOfTrack.coverArt.sources[0].url;
              const width = track.albumOfTrack.coverArt.sources[0].width;
              const height = track.albumOfTrack.coverArt.sources[0].height
              results += `<div class="image">`;
              results += `<img src="${imageUrl}" alt="Track Image" width = ${width} height = ${height}>`;
              results += `</div>`;
            }
            results += `</div> <br><br>`;
        }
        results += `</div>`;
        response.render('trackSeachResults', {results});
    } catch (error) {
        console.error(error);
    }

});

//Rendering page for album search and results
app.get('/album', async (request, response) => {
    response.render('album'); 
});

app.post('/album', async (request, response) => {
    const albumSearch = request.body.albumSearch; 

    const options = {
        method: 'GET',
        url: 'https://spotify23.p.rapidapi.com/search/',
        params: {
          q: String(albumSearch),
          type: 'albums',
          offset: '0',
          limit: '5',
          numberOfTopResults: '5'
        },
        
        headers: {
          'X-RapidAPI-Key': 'd8e92cdc8cmsha8be612abb92cd7p1612b7jsn8651a2069889',
          'X-RapidAPI-Host': 'spotify23.p.rapidapi.com'
        }
      };

      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
      try {
          await client.connect();
          const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne({ 'type': 'album', 'query': albumSearch });
      } catch (e) {
          console.error(e);
      } finally {
          await client.close();
      }

    try {
        const albums_data = await axios.request(options);
        let results = `<div class = "results"> Album Search Results: <br><br>`;
        for (let item of albums_data.data.albums.items) {
            const albums = item.data;
            const id = albums.uri.split(":")[2];
            const album_options = {
                method: 'GET',
                url: 'https://spotify23.p.rapidapi.com/albums/',
                params: {
                  ids: id
                },
                headers: {
                  'X-RapidAPI-Key': 'd8e92cdc8cmsha8be612abb92cd7p1612b7jsn8651a2069889',
                  'X-RapidAPI-Host': 'spotify23.p.rapidapi.com'
                }
            };
            const get_album_data = await axios.request(album_options);
            let a = get_album_data.data.albums;
            for (let album of a) {
                results += `<div class = "info-container" >`
                results += `<div class="info-album">Album: ${album.name}<br>`
                results += `Artists: ${(Array.isArray(album.artists) ? album.artists : [album.artists]).map(artist => artist.name).join(`, `)}<br>`;
                results += `Tracks: ${(Array.isArray(album.tracks.items) ? album.tracks.items : [album.tracks.items]).map(track => `Track #: ${track.track_number} ${track.name}`).join(`<br>`)}<br>`;
                results += `</div>`;                
                if (album.images.length > 0) {
                  const imageUrl = album.images[0].url;
                  const width = album.images[0].width;
                  const height = album.images[0].height
                  results += `<div class="image">`;
                  results += `<img src="${imageUrl}" alt="Album Image" width = ${width} height = ${height}>`;
                  results += `</div>`;
                }
                results += `</div><br><br>`;
            }
        }
        results += `</div>`;
        response.render('albumSearchResults', {results});
    } catch (error) {
        console.error(error);
    }
});



//Render page for artist search and results
app.get('/artist', async (request, response) => {
    response.render('artist'); 
});

app.post('/artist', async (request, response) => {
    const artistSearch = request.body.artistSearch; 

    const options = {
        method: 'GET',
        url: 'https://spotify23.p.rapidapi.com/search/',
        params: {
          q: String(artistSearch),
          type: 'artists',
          offset: '0',
          limit: '5',
          numberOfTopResults: '5'
        },
        headers: {
          'X-RapidAPI-Key': 'd8e92cdc8cmsha8be612abb92cd7p1612b7jsn8651a2069889',
          'X-RapidAPI-Host': 'spotify23.p.rapidapi.com'
        }
    };

    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne({ 'type': 'artist', 'query': artistSearch });
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    try {
        const artists_data = await axios.request(options);
        let results = `<div class = "results"> Artist Search Results: <br><br>`;
        for (let item of artists_data.data.artists.items) {
            const artists = item.data;
            const id = artists.uri.split(":")[2];
            const artists_options = {
                method: 'GET',
                url: 'https://spotify23.p.rapidapi.com/artist_overview/',
                params: {
                  id: id
                },
                headers: {
                  'X-RapidAPI-Key': 'd8e92cdc8cmsha8be612abb92cd7p1612b7jsn8651a2069889',
                  'X-RapidAPI-Host': 'spotify23.p.rapidapi.com'
                }
              };
              
            const get_artist_data = await axios.request(artists_options);
            let a = get_artist_data.data.data.artist;
            for (let artist of (Array.isArray(a) ? a : [a])) {
              results += `<div class = "info-container" >`
              results += `<div class = "info-artist">Artist: ${artist.profile.name}<br>`;

              results += `Some Discography: <br>${(Array.isArray(artist.discography.popularReleases.items) ? 
                  artist.discography.popularReleases.items : [artist.discography.popularReleases.items]).map(disc => 
                      disc.releases.items.map(release => `<span class="tab"></span>Name: ${release.name} (${release.type})`).join('<br>')
                  ).join('<br>')}<br>`;
            
              results += `Some Stats: ${artist.stats.followers} followers and ${artist.stats.monthlyListeners} monthly listeners<br>`;
              results += `Some Related Artists: ${artist.relatedContent.relatedArtists.items.map(related => related.profile.name).join(`, `)}<br>`;
              results += `</div>`;
              if (artist.visuals.avatarImage.sources.length > 0) {
                const imageUrl = artist.visuals.avatarImage.sources[0].url;
                const width = artist.visuals.avatarImage.sources[0].width;
                const height = artist.visuals.avatarImage.sources[0].height
                results += `<div class="image">`;
                results += `<img src="${imageUrl}" alt="Artist Image" width = ${width} height = ${height}>`;
                results += `</div>`;
              }
              results += `</div>><br><br>`;
            }
        }
        results += `</div>`;
        response.render('artistSearchResults', {results});
    } catch (error) {
        console.error(error);
    }
});










app.listen(portNumber);
