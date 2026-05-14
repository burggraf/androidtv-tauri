migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    type: "base",
    name: "providers",
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: "owner = @request.auth.id",
    updateRule: "owner = @request.auth.id",
    deleteRule: "owner = @request.auth.id",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        min: 1,
        max: 200,
      },
      {
        name: "base_url",
        type: "url",
        required: true,
      },
      {
        name: "username",
        type: "text",
        required: true,
        max: 200,
      },
      {
        name: "password",
        type: "text",
        required: true,
        max: 200,
      },
      {
        name: "owner",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: usersCollection.id,
        cascadeDelete: true,
      },
      {
        name: "live_data",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 10485760,
        thumbs: [],
      },
      {
        name: "vod_data",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 10485760,
        thumbs: [],
      },
      {
        name: "series_data",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 10485760,
        thumbs: [],
      },
      { name: "live_version", type: "text", required: false, max: 0 },
      { name: "vod_version", type: "text", required: false, max: 0 },
      { name: "series_version", type: "text", required: false, max: 0 },
      { name: "channels_count", type: "number", required: false, onlyInt: true },
      { name: "movies_count", type: "number", required: false, onlyInt: true },
      { name: "series_count", type: "number", required: false, onlyInt: true },
      { name: "last_sync_at", type: "date", required: false },
      {
        name: "last_sync_status",
        type: "select",
        required: false,
        values: ["idle", "syncing", "success", "error"],
        maxSelect: 1,
      },
      { name: "last_sync_error", type: "text", required: false },
      { name: "status", type: "text", required: false, max: 0 },
      { name: "expires", type: "date", required: false },
      { name: "max_connections", type: "number", required: false, onlyInt: true },
      { name: "active_connections", type: "number", required: false, onlyInt: true },
      { name: "allowed_formats", type: "json", required: false },
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
      "CREATE INDEX idx_providers_owner ON providers (owner)",
    ],
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("providers");
    return app.delete(collection);
  } catch {

  }
});
