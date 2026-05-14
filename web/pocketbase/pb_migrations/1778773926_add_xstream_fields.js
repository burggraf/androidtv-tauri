/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("playlists");

  // Xstream Codes credentials (required for xstream type, optional in schema)
  collection.fields.add(new TextField({
    name: "username",
    required: false,
    max: 200,
  }));
  collection.fields.add(new TextField({
    name: "password",
    required: false,
    max: 200,
  }));

  // Account metadata (auto-populated from xstream API)
  collection.fields.add(new DateField({
    name: "expires",
    required: false,
  }));
  collection.fields.add(new NumberField({
    name: "max_streams",
    required: false,
    onlyInt: true,
  }));
  collection.fields.add(new NumberField({
    name: "current_streams",
    required: false,
    onlyInt: true,
  }));
  collection.fields.add(new NumberField({
    name: "channels",
    required: false,
    onlyInt: true,
  }));
  collection.fields.add(new NumberField({
    name: "movies",
    required: false,
    onlyInt: true,
  }));
  collection.fields.add(new NumberField({
    name: "series",
    required: false,
    onlyInt: true,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("playlists");
  for (const name of ["username", "password", "expires", "max_streams", "current_streams", "channels", "movies", "series"]) {
    const field = collection.fields.getByName(name);
    if (field) collection.fields.removeById(field.id);
  }
  return app.save(collection);
});
