migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const playlistsCollection = app.findCollectionByNameOrId("playlists");

  const collection = new Collection({
    type: "base",
    name: "favorites",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      {
        name: "user",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: usersCollection.id,
        cascadeDelete: true,
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: playlistsCollection.id,
        cascadeDelete: true,
      },
      {
        name: "stream_id",
        type: "text",
        required: true,
        max: 100,
      },
      {
        name: "type",
        type: "select",
        required: true,
        values: ["live", "vod", "series"],
        maxSelect: 1,
      },
      { name: "name", type: "text", required: false, max: 300 },
      { name: "thumbnail", type: "text", required: false, max: 0 },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false,
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_favorites_user ON favorites (user)",
      "CREATE INDEX idx_favorites_playlist ON favorites (playlist)",
      "CREATE UNIQUE INDEX idx_favorites_unique ON favorites (user, playlist, stream_id, type)",
    ],
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("favorites");
    return app.delete(collection);
  } catch {

  }
});
