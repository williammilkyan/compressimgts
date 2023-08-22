var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
let config = [
    {
        path: '/fetchFunctionEnum',
        picExt: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'],
        quality: 1.0,
        backUpOrg: false,
        backUpOrgPath: 'backUpOrg',
        createThumbnail: false,
        thumbnailPath: 'thumbnail', //default is thumbnail
    }
];
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'nodemysqlfs'
});
// [post route goes here]
// upload image
app.post("/compressImage", (req, res) => {
    const image = req.files.image;
    if (image.size > 0) {
        console.log(isPic(image.type));
        console.log("line 61");
        if (isPic(image.type) === true) {
            fileSystem.readFile(image.path, function (error, data) {
                if (error)
                    throw error;
                config[0].path = image.path;
                config[0].picExt = image.type.replace('image/', '');
                filePath = "public/uploads/" + (new Date().getTime()) + "-" + image.name;
                let newName = image.name.replace(".", "");
                compressedFilePath = "public/uploads/" + newName;
                const compression = 60;
                fileSystem.writeFile(filePath, data, function (error) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (error)
                            throw error;
                        handleimg(filePath, compressedFilePath, compression);
                    });
                });
                config[0].backUpOrgPath = filePath.replace("public", "");
                config[0].backUpOrg = true;
                config[0].thumbnailPath = "/uploads/" + newName + filePath.replace("public/uploads/", "");
                res.render("process.ejs", {
                    oPath: config[0].backUpOrgPath,
                });
                // remove temp file in document/user
                fileSystem.unlink(image.path, function (error) {
                    if (error)
                        throw error;
                });
            });
        }
        else {
            console.log("need image!");
            res.render("index.ejs");
        }
    }
    else {
        console.log("need a file!");
        res.render("index.ejs");
    }
});
// [get route goes here]
app.get("/", (req, res) => {
    res.render("index.ejs");
});
app.get("/success", (req, res) => {
    res.render("success.ejs", {
        oPath: config[0].backUpOrgPath,
        cPath: config[0].thumbnailPath
    });
    console.log(config[0]);
});
app.listen(port, () => {
    console.log("Server started running at port: " + port);
});
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isPic(image) {
    const ext = image.toLowerCase();
    console.log(ext);
    if (ext == 'image/jpg' || ext == 'image/png' || ext == 'image/svg' || ext == 'image/git' || ext == 'image/jpeg') {
        return true;
    }
    else {
        return false;
    }
}
// compress the image
function pressimg(filePath, compressedFilePath, compression) {
    return __awaiter(this, void 0, void 0, function* () {
        let result;
        compressImages(filePath, compressedFilePath, {
            compress_force: false, statistic: true,
            autoupdate: true
        }, false, { jpg: { engine: "mozjpeg", command: ["-quality", compression] } }, { png: { engine: "pngquant", command: ["--quality=" + compression + "-" + compression, "-o"] } }, { svg: { engine: "svgo", command: "--multipass" } }, { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } }, function (error, completed, statistic) {
            console.log("---------------------------");
            console.log(error);
            console.log(completed);
            console.log(statistic);
            result = statistic;
            console.log("----------------------------");
            /*fileSystem.unlink(filePath, function (error) {
                if(error) throw error;
            })*/
        });
        yield delay(3000);
        console.log(result + ' line 110');
        return result;
    });
}
// upload to mysql 
function uploaddb() {
    db.getConnection((err, connection) => {
        if (err)
            throw err;
        console.log('Connected to MySQL database');
        let sql = `INSERT INTO images (Original_image, Compressed_image) VALUES (?, ?)`;
        connection.query(sql, [config[0].backUpOrgPath, config[0].thumbnailPath], function (err, result) {
            if (err)
                throw err;
            console.log(result.affectedRows + " record(s) insert");
            connection.release();
        });
    });
}
//combine  pressimg and uploaddb
function handleimg(filePath, compressedFilePath, compression) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let resultf = yield pressimg(filePath, compressedFilePath, compression);
            console.log(resultf + 'line 130');
            uploaddb();
            config[0].quality = resultf.percent;
            config[0].createThumbnail = true;
        }
        catch (err) {
            console.log(err);
        }
    });
}
