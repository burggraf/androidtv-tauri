/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("playlists");

  // Add autodate fields that were missing in initial migration
  collection.fields.add(new AutodateField({
    name: "created",
    onCreate: true,
    onUpdate: false,
  }));
  collection.fields.add(new AutodateField({
    name: "updated",
    onCreate: true,
    onUpdate: true,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("playlists");
  collection.fields.removeById("created");
  collection.fields.removeById("updated");
  return app.save(collection);
});
