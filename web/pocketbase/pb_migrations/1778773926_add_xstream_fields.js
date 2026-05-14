migrate((app) => {
  const collection = app.findCollectionByNameOrId("playlists");

  // Add xstream-specific fields only (username/password already in create_playlists)
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
  for (const name of ["expires", "max_streams", "current_streams", "channels", "movies", "series"]) {
    const field = collection.fields.getByName(name);
    if (field) collection.fields.removeById(field.id);
  }
  return app.save(collection);
});
