import {Database} from '@sqlitecloud/drivers';
import {useState, useEffect} from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import { DATABASE_URL } from '@env';

export default function App() {
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    async function getAlbums() {
      const db = new Database(`${DATABASE_URL}`);

      const result =
        await db.sql`USE DATABASE chinook.sqlite; SELECT albums.AlbumId as id, albums.Title as title, artists.name as artist FROM albums INNER JOIN artists WHERE artists.ArtistId = albums.ArtistId LIMIT 20;`;

      setAlbums(result);
    }

    getAlbums();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Albums</Text>
      <FlatList
        data={albums}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <Text style={styles.listItem}>
            • {item.title} by {item.artist}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
  },
  listItem: {
    paddingVertical: 3,
  },
});
