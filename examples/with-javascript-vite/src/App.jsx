import { useEffect, useState } from "react";
import { Database } from "@sqlitecloud/drivers";


function App() {
  const [data, setData] = useState([]);

  const getAlbums = async () => {
    let database = null;
    try {
      database = new Database(import.meta.env.VITE_DATABASE_URL)
      const result = await database.sql(`
        USE DATABASE chinook.sqlite; 
        SELECT albums.AlbumId as id, albums.Title as title, artists.name as artist
        FROM albums 
        INNER JOIN artists 
        WHERE artists.ArtistId = albums.ArtistId
        LIMIT 20;
      `);
      setData(result);
    } catch (error) {
      console.error("Error getting albums", error);
    } finally {
      database.close();
    }
  };

  useEffect(() => {
    getAlbums();
  }, []);

  return (
    <div>
      <h1>Albums</h1>
      <ul>
        {data.map((album) => (
          <li key={album.id}>
            {album.title} by {album.artist}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
