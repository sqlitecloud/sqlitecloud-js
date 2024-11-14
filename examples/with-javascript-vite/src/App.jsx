import { useEffect, useState } from "react";
import { Database } from "@sqlitecloud/drivers";

const db = new Database(import.meta.env.VITE_DATABASE_URL);

function App() {
  const [data, setData] = useState([]);

  const getAlbums = async () => {
    const result = await db.sql`
      USE DATABASE chinook.sqlite; 
      SELECT albums.AlbumId as id, albums.Title as title, artists.name as artist
      FROM albums 
      INNER JOIN artists 
      WHERE artists.ArtistId = albums.ArtistId
      LIMIT 20;
    `;
    setData(result);
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
