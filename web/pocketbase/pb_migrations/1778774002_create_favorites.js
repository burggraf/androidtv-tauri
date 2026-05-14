migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");
  const providersCollection = app.findCollectionByNameOrId("providers");

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
        name: "provider",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: providersCollection.id,
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
      "CREATE INDEX idx_favorites_provider ON favorites (provider)",
      "CREATE UNIQUE INDEX idx_favorites_unique ON favorites (user, provider, stream_id, type)",
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
