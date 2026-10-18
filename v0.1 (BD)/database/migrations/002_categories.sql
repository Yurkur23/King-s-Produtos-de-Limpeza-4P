-- Categorias necessárias à aplicação, disponíveis também sem dados demonstrativos.
INSERT INTO categories(name) VALUES ('Limpeza Geral'),('Limpeza Automotiva'),('Equipamentos')
ON CONFLICT(name) DO NOTHING;
