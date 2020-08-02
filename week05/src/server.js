const http = require("http");

http.createServer((request, response) => {
  let body = [];
  request.on('error', (err) => {
    console.log(err);
  }).on('data', (chunk) => {
    // console.log("on data", chunk.toString())
    console.log("on data")
    body.push(chunk.toString());
    // body.push(chunk);
    console.log(body)
  }).on('end', () => {
    console.log("on end")
    // body = Buffer.concat(body).toString();
    body = body.join("");
    console.log("body: ", body);
    response.writeHead(200, { 'Content-Type': 'text/html' });
    // response.end(' Hello World\n');
    // response.end(' Hello World\r');
    response.end(
      `<html maaa=a >
    <head>
          <style>
    body div #myid{
      width:100px;
      background-color: #ff5000;
    }
    body div img{
      width:30px;
      background-color: #ff1111;
    }
      </style>
    </head>
    <body>
      <div>
          <img id="myid"/>
          <img />
      </div>
    </body>
    </html>`);
  });

  //   response.end(
  //     `<html maaa=a >
  //   <head>
  //         <style>
  //   #container {
  //     width:500px;
  //     height:300px;
  //     display:flex;
  //     background-color:rgb(255,255,255);
  //   }
  //   #container #myid {
  //     width:200px;
  //     height:100px;
  //     background-color:rgb(255,0,0);
  //   }
  //   #container .c1 {
  //     flex:1;
  //     background-color:rgb(0,255,0);
  //   }
  //     </style>
  //   </head>
  //   <body>
  //     <div id="container">
  //         <div id="myid"/>
  //         <div class="c1" />
  //     </div>
  //   </body>
  //   </html>`);

  // });
}).listen(8088);

console.log('server running');