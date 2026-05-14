/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    type: "base",
    name: "playlists",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        min: 1,
        max: 200,
      },
      {
        name: "url",
        type: "url",
        required: true,
      },
      {
        name: "type",
        type: "select",
        required: true,
        values: ["m3u", "xstream"],
        maxSelect: 1,
      },
      {
        name: "enabled",
        type: "bool",
        required: true,
      },
      {
        name: "user",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: usersCollection.id,
        cascadeDelete: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_playlists_user ON playlists (user)",
    ],
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("playlists");
    return app.delete(collection);
  } catch {
    // collection may not exist
  }
});
