# Organizacao Operacional - ServicoPro

Raiz oficial do projeto:

```text
/opt/servicopro
```

Estrutura oficial:

```text
/opt/servicopro/backend      Fonte e publicacao da API .NET
/opt/servicopro/frontend     Fonte React/Vite
/opt/servicopro/public       Frontend publicado servido pelo Nginx
/opt/servicopro/dados        Dados persistentes locais
/opt/servicopro/segredos     Segredos locais com permissao restrita
/opt/servicopro/sqlserver    Scripts SQL e apoio ao SQL Server
/opt/servicopro/scripts      Scripts de diagnostico, deploy e manutencao
/opt/servicopro/docs         Documentacao tecnica do projeto
/opt/servicopro/runtime      Copia oficial das configuracoes externas
/opt/servicopro/logs         Logs proprios quando aplicavel
```

Arquivos externos necessarios ao Linux:

```text
/etc/systemd/system/servicopro-api.service
/etc/nginx/sites-available/servicopro-777
/etc/nginx/sites-enabled/servicopro-777
```

Regra oficial:

- Codigo-fonte ativo do ServicoPro fica apenas em /opt/servicopro/backend e /opt/servicopro/frontend.
- Publicacao frontend oficial fica em /opt/servicopro/public.
- Configuracoes externas devem ter copia de referencia em /opt/servicopro/runtime.
- Backups continuam fora da raiz, em /opt/backups/servicopro.
- Debugs continuam fora da raiz, em /opt/debug_*.
