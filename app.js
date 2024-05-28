const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const NodeCouchdb = require('node-couchdb');

const couch = new NodeCouchdb({
    auth: {
        user: 'yunus',
        pass: '123456'
    }
});

const dbname = 'kitaplar';
const viewUrl = '_design/tumKitaplar/_view/tum';

couch.listDatabases().then(function(dbs) {
    console.log(dbs);
});

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
    couch.get(dbname, viewUrl).then(
        function(data, headers, status) {
            console.log(data.data.rows);
            res.render('index', {
                kitaplar: data.data.rows
            });
        },
        function(err) {
            res.send(err);
        }
    );
});

app.post('/kitap/ekle', function(req, res) {
    const kitapAdi = req.body.kitapAdi;
    const kitapYazari = req.body.kitapYazari;
    const kategori = req.body.kategori;
    const resim = req.body.resim;

    if (kitapAdi && kitapYazari && kategori && resim) {
        couch.uniqid().then(function(ids) {
            const id = ids[0];
            couch.insert(dbname, {
                _id: id,
                kitapAdi: kitapAdi,
                kitapYazari: kitapYazari,
                kategori: kategori,
                resim: resim
            }).then(
                function(data, headers, status) {
                    res.redirect('/');
                },
                function(err) {
                    res.send(err);
                }
            );
        });
    } else {
        couch.get(dbname, viewUrl).then(
            function(data, headers, status) {
                console.log(data.data.rows);
                res.render('index', {
                    kitaplar: data.data.rows,
                    hataMesaji: 'Lütfen tüm alanları doldurun.',
                    girilenDegerler: {
                        kitapAdi: kitapAdi,
                        kitapYazari: kitapYazari,
                        kategori: kategori,
                        resim: resim
                    }
                });
            },
            function(err) {
                res.send(err);
            }
        );
    }

});

app.post('/kitap/ara', function(req, res) {
    const aramaKelimesi = req.body.aramaKelimesi;

    if (aramaKelimesi) {
        couch.get(dbname, viewUrl).then(
            function(data, headers, status) {
                const kitaplar = data.data.rows.filter(function(kitap) {
                    const kitapAdi = kitap.value.kitapAdi;
                    const kitapYazari = kitap.value.kitapYazari;
                    const kategori = kitap.value.kategori;

                    if (typeof kitapAdi === 'string' && typeof kitapYazari === 'string' && typeof kategori === 'string') {
                        return kitapAdi.toLowerCase().includes(aramaKelimesi.toLowerCase()) ||
                            kitapYazari.toLowerCase().includes(aramaKelimesi.toLowerCase()) ||
                            kategori.toLowerCase().includes(aramaKelimesi.toLowerCase());
                    }

                    return false;
                });

                res.render('index', { kitaplar: kitaplar });
            },
            function(err) {
                res.send(err);
            }
        );
    } else {
        res.redirect('/');
    }
});

app.post('/kitap/guncelle', function(req, res) {
    const kitapAdi = req.body.kitapAdi; // Formdan kitap adını al

    const yeniKitapAdi = req.body.yeniKitapAdi;
    const yeniKitapYazari = req.body.yeniKitapYazari;
    const yeniKategori = req.body.yeniKategori;
    const yeniResim = req.body.yeniResim;

    // Kitabın adına göre id'sini almak için sorgu yap
    couch.get(dbname, viewUrl).then(
        function(data, headers, status) {
            const kitaplar = data.data.rows;
            let kitapId;

            // Kitap adına göre ilgili kitabın id'sini bul
            for (let i = 0; i < kitaplar.length; i++) {
                if (kitaplar[i].value.kitapAdi === kitapAdi) {
                    kitapId = kitaplar[i].id;
                    break;
                }
            }

            if (kitapId) {
                // Bulunan kitabın id'si ile güncelleme işlemi yap
                couch.get(dbname, kitapId).then(
                    function(data, headers, status) {
                        const existingDoc = data.data;

                        // Yeni verilerle güncelleme yap
                        existingDoc.kitapAdi = yeniKitapAdi;
                        existingDoc.kitapYazari = yeniKitapYazari;
                        existingDoc.kategori = yeniKategori;
                        existingDoc.resim = yeniResim;

                        // Güncelleme işlemi için update fonksiyonunu kullan
                        couch.update(dbname, existingDoc).then(
                            function(data, headers, status) {
                                res.redirect('/');
                            },
                            function(err) {
                                res.send(err);
                            }
                        );
                    },
                    function(err) {
                        res.send(err);
                    }
                );
            } else {
                res.send('Belirtilen kitap adıyla eşleşen bir kitap bulunamadı.');
            }
        },
        function(err) {
            res.send(err);
        }
    );
});


app.post('/kitap/delete/:id', function(req, res) {
    const id = req.params.id;
    const rev = req.body.rev;

    couch.del(dbname, id, rev).then(
        function(data, headers, status) {
            res.redirect('/');
        },
        function(err) {
            res.send(err);
        }
    );
});




app.listen(3000, function() {
    console.log('Server started on 3000 Port');
})