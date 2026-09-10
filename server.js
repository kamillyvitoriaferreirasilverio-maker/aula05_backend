const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Ajustado com '..' para encontrar a pasta /dados na raiz
const FILE_PATH = path.join(__dirname, '..', 'dados', 'inventario.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const lerInventario = () => {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const salvarInventario = (dados) => {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(dados, null, 2), 'utf-8');
    } catch (error) {
        console.error("Erro ao salvar dados:", error);
    }
};

app.get('/inventario/valor-total', (req, res) => {
    const inventario = lerInventario();
    const total = inventario.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    return res.status(200).json({ valorTotal: total, totalItens: inventario.length });
});

app.post('/inventario', (req, res) => {
    const { item, local, dataRegistro, valor, patrimonio } = req.body;

    if (!item || !local || !dataRegistro || valor === undefined || !patrimonio) {
        return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const inventario = lerInventario();

    const patrimonioExiste = inventario.some(i => i.patrimonio === patrimonio);
    if (patrimonioExiste) {
        return res.status(409).json({ mensagem: "Número de patrimônio já cadastrado." });
    }

    const novoId = inventario.length > 0 ? Math.max(...inventario.map(i => i.id)) + 1 : 1;

    const novoItem = {
        id: novoId,
        item,
        local,
        dataRegistro,
        valor: Number(valor),
        patrimonio
    };

    inventario.push(novoItem);
    salvarInventario(inventario);

    return res.status(201).json(novoItem);
});

app.get('/inventario', (req, res) => {
    let inventario = lerInventario();
    const { nome, local, valorMinimo } = req.query;

    if (nome) {
        inventario = inventario.filter(i => i.item.toLowerCase().includes(nome.toLowerCase()));
    }
    if (local) {
        inventario = inventario.filter(i => i.local.toLowerCase().includes(local.toLowerCase()));
    }
    if (valorMinimo) {
        inventario = inventario.filter(i => i.valor >= Number(valorMinimo));
    }

    return res.status(200).json(inventario);
});

app.get('/inventario/:id', (req, res) => {
    const { id } = req.params;
    const inventario = lerInventario();
    const itemEncontrado = inventario.find(i => i.id == id);

    if (!itemEncontrado) {
        return res.status(404).json({ mensagem: "Item não encontrado :(" });
    }

    return res.status(200).json(itemEncontrado);
});

app.put('/inventario/:id', (req, res) => {
    const { id } = req.params;
    const { item, local, dataRegistro, valor, patrimonio } = req.body;
    const inventario = lerInventario();

    const indice = inventario.findIndex(i => i.id == id);

    if (indice === -1) {
        return res.status(404).json({ mensagem: "Item não encontrado :(" });
    }

    if (patrimonio) {
        const patrimonioExiste = inventario.some(i => i.patrimonio === patrimonio && i.id != id);
        if (patrimonioExiste) {
            return res.status(409).json({ mensagem: "Número de patrimônio já cadastrado em outro item." });
        }
    }

    inventario[indice] = {
        id: Number(id),
        item: item !== undefined ? item : inventario[indice].item,
        local: local !== undefined ? local : inventario[indice].local,
        dataRegistro: dataRegistro !== undefined ? dataRegistro : inventario[indice].dataRegistro,
        valor: valor !== undefined ? Number(valor) : inventario[indice].valor,
        patrimonio: patrimonio !== undefined ? patrimonio : inventario[indice].patrimonio
    };

    salvarInventario(inventario);

    return res.status(200).json({ mensagem: "Item atualizado com sucesso!", item: inventario[indice] });
});

app.delete('/inventario/:id', (req, res) => {
    const { id } = req.params;
    const inventario = lerInventario();

    const indice = inventario.findIndex(i => i.id == id);

    if (indice === -1) {
        return res.status(404).json({ mensagem: "Item não encontrado :(" });
    }

    inventario.splice(indice, 1);
    salvarInventario(inventario);

    return res.status(200).json({ mensagem: "Item excluído com sucesso!" });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});