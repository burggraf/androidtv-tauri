migrate((app) => {
  const collection = app.findCollectionByNameOrId("playlists");

  // created/updated already defined in create_playlists — skip
  return app.save(collection);
}, (app) => {
  return app.save(app.findCollectionByNameOrId("playlists"));
});
