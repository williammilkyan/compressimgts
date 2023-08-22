import express from 'express';
import cors from 'cors';
import compressImages from "compress-images";
import formidable from "express-formidable";
import mysql from "mysql";
import fileSystem from "fs";

const app = express();
app.use(express.json());
app.use(formidable());
app.use(cors());
app.set("view engine", "ejs");
app.use(express.static("public"));


const port = 3000;

let filePath = "";
let compressedFilePath = "";

interface config {
    path:           string;
    picExt:         string;
    quality:        number;
    backUpOrg:      boolean;
    backUpOrgPath:  string;
    createThumbnail: boolean;
    thumbnailPath:  string;
}

let config = [
    {
        path: '/fetchFunctionEnum',
        picExt: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'],
        quality: 1.0, //0.1-1.0, default is 1.0
        backUpOrg: false, //default is false
        backUpOrgPath: 'backUpOrg', //default is backUpOrg
        createThumbnail: false, //default is true
        thumbnailPath: 'thumbnail', //default is thumbnail

    }]


const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'nodemysqlfs'
  });


    // [post route goes here]
    // upload image


app.post("/compressImage", (req: any, res: any) =>{
    const image = req.files.image;
        
    if(image.size > 0) {
        if(isPic(image.type) === true) {
            fileSystem.readFile(image.path, function (error: any, data: any) {
            if (error) throw error;
            config[0].path = image.path;
            config[0].picExt = image.type.replace('image/', '');
                filePath = "public/uploads/" + (new Date().getTime()) + "-" + image.name;
                let newName = image.name.replace(".", "");

                compressedFilePath = "public/uploads/" + newName;
                const compression = 60;
                fileSystem.writeFile(filePath, data, async function (error: any){
                    if (error) throw error;
                        handleimg(filePath, compressedFilePath, compression);                           
                    })
                     config[0].backUpOrgPath = filePath.replace("public", "");
                     config[0].backUpOrg = true
                     config[0].thumbnailPath = "/uploads/" + newName + filePath.replace("public/uploads/", "");
                   
                    
                    res.render("process.ejs", {
                            oPath: config[0].backUpOrgPath,
                            
                    })
                        // remove temp file in document/user
                        fileSystem.unlink(image.path, function (error: any) {
                            if (error) throw error;
                        }) 
            })
            } else {
                console.log("need image!");
                res.render("index.ejs");
                    }
    } else {
        console.log("need a file!");
        res.render("index.ejs");
            }
            
})



    // [get route goes here]
app.get("/", (req: any, res: any) => {
    res.render("index.ejs");
})

app.get("/success", (req: any, res: any) => {
    res.render("success.ejs", {
        oPath: config[0].backUpOrgPath,
        cPath: config[0].thumbnailPath
    });
    console.log(config[0]);
    
})

app.listen(port, () => {
    console.log("Server started running at port: " + port);
})

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isPic(image: string): boolean {
    const ext:string = image.toLowerCase();
    if(ext == 'image/jpg' || ext == 'image/png' || ext == 'image/svg' || ext == 'image/git' || ext == 'image/jpeg'){
        return true;
    }else{
        return false;
    }
}

  // compress the image
async function pressimg(filePath: string, compressedFilePath: string, compression: number) {
    let result;
    compressImages(filePath, compressedFilePath, {
        compress_force: false, statistic: true,
        autoupdate: true }, false,
        {jpg: {engine: "mozjpeg", command: ["-quality", compression]}},
        {png: {engine: "pngquant", command: ["--quality=" + compression + "-" + compression, "-o" ]}},
        {svg: {engine: "svgo", command: "--multipass" }},
        {gif: {engine: "gifsicle", command: ["--colors", "64", "--use-col=web"]}},
           function (error: any, completed: boolean, statistic: any) {
            console.log("---------------------------");
            console.log(error);
            console.log(completed);
            console.log(statistic);
            result = statistic;
            console.log("----------------------------");
            
            /*fileSystem.unlink(filePath, function (error) {
                if(error) throw error;
            })*/
            
        })
        await delay(3000);
        
        console.log(result + ' line 110');
        return result;
}
// upload to mysql 
function uploaddb() {
    db.getConnection((err:any, connection: any) => {
        if (err) throw err;
        console.log('Connected to MySQL database');
        let sql = `INSERT INTO images (Original_image, Compressed_image) VALUES (?, ?)`;
        connection.query(sql, [ config[0].backUpOrgPath, config[0].thumbnailPath],function (err: any, result: any) {
            if (err) throw err;
            console.log(result.affectedRows + " record(s) insert");
            connection.release();
          });
      });
}
//combine  pressimg and uploaddb
 async function handleimg(filePath: string, compressedFilePath: string, compression: number) {
    try {
    let resultf: any = await pressimg(filePath, compressedFilePath, compression);
    console.log(resultf + 'line 130');
    
    uploaddb();
    config[0].quality = resultf.percent;
    config[0].createThumbnail = true;
    } catch (err) {
        console.log(err);
    }
}
