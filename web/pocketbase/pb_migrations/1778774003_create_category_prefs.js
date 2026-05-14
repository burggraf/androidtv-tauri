migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const playlistsCollection = app.findCollectionByNameOrId("playlists");

  const collection = new Collection({
    type: "base",
    name: "category_prefs",
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
        name: "type",
        type: "select",
        required: true,
        values: ["live", "vod", "series"],
        maxSelect: 1,
      },
      {
        name: "category_id",
        type: "text",
        required: true,
        max: 100,
      },
      {
        name: "hidden",
        type: "bool",
        required: true,
      },
      {
        name: "sort_order",
        type: "number",
        required: true,
        onlyInt: true,
      },
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
      "CREATE INDEX idx_category_prefs_user ON category_prefs (user)",
      "CREATE INDEX idx_category_prefs_playlist ON category_prefs (playlist)",
      "CREATE UNIQUE INDEX idx_category_prefs_unique ON category_prefs (user, playlist, type, category_id)",
    ],
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("category_prefs");
    return app.delete(collection);
  } catch {

  }
});
