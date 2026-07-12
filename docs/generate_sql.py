import pandas as pd
import numpy as np

# 1. CFOP
print("Lendo CFOP...")
df_cfop = pd.read_excel('/opt/servicopro/docs/Tabela_CFOP.xlsx')

with open('/opt/servicopro/docs/inserts_cfop.sql', 'w', encoding='utf-8') as f:
    f.write("USE db_servicopro_mssql;\nGO\n\n")
    for index, row in df_cfop.iterrows():
        codigo = str(row['CFOP']).strip()
        descricao = str(row['Descrição Resumida']).strip().replace("'", "''")
        ind_nfe = 1 if row['indNFe'] == 1 else 0
        ind_com = 1 if row['indComunica'] == 1 else 0
        ind_trans = 1 if row['indTransp'] == 1 else 0
        ind_dev = 1 if row['indDevol'] == 1 else 0
        
        sql = f"IF NOT EXISTS (SELECT 1 FROM Cfops WHERE Codigo = '{codigo}') " \
              f"INSERT INTO Cfops (Codigo, DescricaoResumida, IndNFe, IndComunica, IndTransp, IndDevol, Ativo) " \
              f"VALUES ('{codigo}', '{descricao}', {ind_nfe}, {ind_com}, {ind_trans}, {ind_dev}, 1);\n"
        f.write(sql)
print("Gerou inserts_cfop.sql")

# 2. NCM
print("Lendo NCM...")
# Note: NCM from Siscomex usually has 'Código' and 'Descrição'
# Let's check the columns first. We will assume standard columns or index.
# We will use skiprows if needed, but Siscomex is usually: 'Codigo', 'Descricao'
df_ncm = pd.read_excel('/opt/servicopro/docs/Tabela_NCM_Vigente_20260708.xlsx')
# Rename for ease if needed, but let's just use positional or check headers
columns = df_ncm.columns
print("NCM Columns:", columns)
col_codigo = columns[0]
col_desc = columns[1]

with open('/opt/servicopro/docs/inserts_ncm.sql', 'w', encoding='utf-8') as f:
    f.write("USE db_servicopro_mssql;\nGO\n\n")
    for index, row in df_ncm.iterrows():
        codigo = str(row[col_codigo]).replace(".", "").strip()
        descricao = str(row[col_desc]).strip().replace("'", "''")
        
        # Some NCMs might be empty or invalid
        if codigo and codigo != 'nan' and len(codigo) >= 2:
            sql = f"IF NOT EXISTS (SELECT 1 FROM Ncms WHERE Codigo = '{codigo}') " \
                  f"INSERT INTO Ncms (Codigo, Descricao, Ativo) " \
                  f"VALUES ('{codigo}', '{descricao}', 1);\n"
            f.write(sql)
print("Gerou inserts_ncm.sql")
