using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicoPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class EnforceDataIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Limpa dados antigos que não são compatíveis com a nova estrutura rígida de chaves estrangeiras
            migrationBuilder.Sql("DELETE FROM LivroCaixa");
            migrationBuilder.Sql("DELETE FROM TransacoesFinanceiras");
            migrationBuilder.Sql("DELETE FROM OrcamentoItens");
            migrationBuilder.Sql("DELETE FROM Compras");

            migrationBuilder.DropColumn(
                name: "OrigemId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropColumn(
                name: "ItemId",
                table: "OrcamentoItens");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "OrcamentoItens");

            migrationBuilder.DropColumn(
                name: "Fornecedor",
                table: "Compras");

            migrationBuilder.AddColumn<Guid>(
                name: "CompraId",
                table: "TransacoesFinanceiras",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OrdemServicoId",
                table: "TransacoesFinanceiras",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProdutoId",
                table: "OrcamentoItens",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ServicoId",
                table: "OrcamentoItens",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FornecedorId",
                table: "Compras",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_TransacoesFinanceiras_CompraId",
                table: "TransacoesFinanceiras",
                column: "CompraId");

            migrationBuilder.CreateIndex(
                name: "IX_TransacoesFinanceiras_OrdemServicoId",
                table: "TransacoesFinanceiras",
                column: "OrdemServicoId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentoItens_ProdutoId",
                table: "OrcamentoItens",
                column: "ProdutoId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentoItens_ServicoId",
                table: "OrcamentoItens",
                column: "ServicoId");

            migrationBuilder.CreateIndex(
                name: "IX_LivroCaixa_TransacaoId",
                table: "LivroCaixa",
                column: "TransacaoId");

            migrationBuilder.CreateIndex(
                name: "IX_Compras_FornecedorId",
                table: "Compras",
                column: "FornecedorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Compras_Clientes_FornecedorId",
                table: "Compras",
                column: "FornecedorId",
                principalTable: "Clientes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LivroCaixa_TransacoesFinanceiras_TransacaoId",
                table: "LivroCaixa",
                column: "TransacaoId",
                principalTable: "TransacoesFinanceiras",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_OrcamentoItens_Produtos_ProdutoId",
                table: "OrcamentoItens",
                column: "ProdutoId",
                principalTable: "Produtos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OrcamentoItens_Servicos_ServicoId",
                table: "OrcamentoItens",
                column: "ServicoId",
                principalTable: "Servicos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TransacoesFinanceiras_Compras_CompraId",
                table: "TransacoesFinanceiras",
                column: "CompraId",
                principalTable: "Compras",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TransacoesFinanceiras_OrdensServico_OrdemServicoId",
                table: "TransacoesFinanceiras",
                column: "OrdemServicoId",
                principalTable: "OrdensServico",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Compras_Clientes_FornecedorId",
                table: "Compras");

            migrationBuilder.DropForeignKey(
                name: "FK_LivroCaixa_TransacoesFinanceiras_TransacaoId",
                table: "LivroCaixa");

            migrationBuilder.DropForeignKey(
                name: "FK_OrcamentoItens_Produtos_ProdutoId",
                table: "OrcamentoItens");

            migrationBuilder.DropForeignKey(
                name: "FK_OrcamentoItens_Servicos_ServicoId",
                table: "OrcamentoItens");

            migrationBuilder.DropForeignKey(
                name: "FK_TransacoesFinanceiras_Compras_CompraId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropForeignKey(
                name: "FK_TransacoesFinanceiras_OrdensServico_OrdemServicoId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropIndex(
                name: "IX_TransacoesFinanceiras_CompraId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropIndex(
                name: "IX_TransacoesFinanceiras_OrdemServicoId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropIndex(
                name: "IX_OrcamentoItens_ProdutoId",
                table: "OrcamentoItens");

            migrationBuilder.DropIndex(
                name: "IX_OrcamentoItens_ServicoId",
                table: "OrcamentoItens");

            migrationBuilder.DropIndex(
                name: "IX_LivroCaixa_TransacaoId",
                table: "LivroCaixa");

            migrationBuilder.DropIndex(
                name: "IX_Compras_FornecedorId",
                table: "Compras");

            migrationBuilder.DropColumn(
                name: "CompraId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropColumn(
                name: "OrdemServicoId",
                table: "TransacoesFinanceiras");

            migrationBuilder.DropColumn(
                name: "ProdutoId",
                table: "OrcamentoItens");

            migrationBuilder.DropColumn(
                name: "ServicoId",
                table: "OrcamentoItens");

            migrationBuilder.DropColumn(
                name: "FornecedorId",
                table: "Compras");

            migrationBuilder.AddColumn<string>(
                name: "OrigemId",
                table: "TransacoesFinanceiras",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ItemId",
                table: "OrcamentoItens",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "OrcamentoItens",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Fornecedor",
                table: "Compras",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
