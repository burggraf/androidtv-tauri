/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("playlists");

  // File fields for bulk compressed provider data
  collection.fields.add(new FileField({
    name: "live_data",
    type: "file",
    required: false,
    maxSelect: 1,
    maxSize: 10485760, // 10MB
    mimeTypes: [],
    thumbs: [],
    protected: false,
  }));
  collection.fields.add(new FileField({
    name: "vod_data",
    type: "file",
    required: false,
    maxSelect: 1,
    maxSize: 10485760,
    mimeTypes: [],
    thumbs: [],
    protected: false,
  }));
  collection.fields.add(new FileField({
    name: "series_data",
    type: "file",
    required: false,
    maxSelect: 1,
    maxSize: 10485760,
    mimeTypes: [],
    thumbs: [],
    protected: false,
  }));

  // Version hashes for sync detection
  collection.fields.add(new TextField({
    name: "live_version",
    required: false,
  }));
  collection.fields.add(new TextField({
    name: "vod_version",
    required: false,
  }));
  collection.fields.add(new TextField({
    name: "series_version",
    required: false,
  }));

  // Sync status tracking
  collection.fields.add(new DateField({
    name: "last_sync_at",
    required: false,
  }));
  collection.fields.add(new SelectField({
    name: "last_sync_status",
    required: false,
    maxSelect: 1,
    values: ["idle", "syncing", "success", "error"],
  }));
  collection.fields.add(new TextField({
    name: "last_sync_error",
    required: false,
  }));

  // Account metadata from auth response (renamed from existing fields for clarity)
  collection.fields.add(new NumberField({
    name: "max_connections",
    required: false,
    onlyInt: true,
  }));
  collection.fields.add(new NumberField({
    name: "active_connections",
    required: false,
    onlyInt: true,
  }));
  collection.fields.add(new JSONField({
    name: "allowed_formats",
    required: false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("playlists");
  for (const name of [
    "live_data", "vod_data", "series_data",
    "live_version", "vod_version", "series_version",
    "last_sync_at", "last_sync_status", "last_sync_error",
    "max_connections", "active_connections", "allowed_formats",
  ]) {
    const field = collection.fields.getByName(name);
    if (field) collection.fields.removeById(field.id);
  }
  return app.save(collection);
});
