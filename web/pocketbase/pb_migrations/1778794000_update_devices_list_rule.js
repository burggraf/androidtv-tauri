migrate((app) => {
  const collection = app.findCollectionByNameOrId("devices");
  collection.listRule = '';
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("devices");
  collection.listRule = 'user = @request.auth.id';
  return app.save(collection);
});
