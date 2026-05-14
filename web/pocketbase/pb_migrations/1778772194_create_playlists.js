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
      // Xstream Codes credentials
      { name: "username", type: "text", required: false, max: 200 },
      { name: "password", type: "text", required: false, max: 200 },
      // Account metadata (auto-populated from xstream API)
      { name: "expires", type: "date", required: false },
      { name: "max_streams", type: "number", required: false, onlyInt: true },
      { name: "current_streams", type: "number", required: false, onlyInt: true },
      { name: "channels", type: "number", required: false, onlyInt: true },
      { name: "movies", type: "number", required: false, onlyInt: true },
      { name: "series", type: "number", required: false, onlyInt: true },
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
