(function(contextTypes){

var connect = require("connect");

var app53999 = connect();
app53999.use(connect.query());
app53999.use(connect.bodyParser());
app53999.use($data.JayService.OData.BatchProcessor.connectBodyReader);
$data.Class.defineEx("newsreader", [contextTypes["NewsReader"], $data.ServiceBase]);
app53999.use("/newsreader", $data.JayService.createAdapter(newsreader, function(){
    return new newsreader({ name: "mongoDB", databaseName: "NewsReader" });
}));

app53999.listen(53999);

})(require("./context.js").contextTypes);