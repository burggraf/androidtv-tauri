migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const playlistsCollection = app.findCollectionByNameOrId("playlists");

  const collection = new Collection({
    type: "base",
    name: "display_prefs",
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
      { name: "settings", type: "json", required: false },
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
      "CREATE INDEX idx_display_prefs_user ON display_prefs (user)",
      "CREATE UNIQUE INDEX idx_display_prefs_unique ON display_prefs (user, playlist)",
    ],
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("display_prefs");
    return app.delete(collection);
  } catch {

  }
});
