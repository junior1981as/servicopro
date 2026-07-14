using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicoPro.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNcmFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Ncm",
                table: "Produtos");

            migrationBuilder.AddColumn<string>(
                name: "NcmCodigo",
                table: "Produtos",
                type: "nvarchar(20)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Ncms",
                columns: table => new
                {
                    Codigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Descricao = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Ativo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ncms", x => x.Codigo);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Produtos_NcmCodigo",
                table: "Produtos",
                column: "NcmCodigo");

            migrationBuilder.AddForeignKey(
                name: "FK_Produtos_Ncms_NcmCodigo",
                table: "Produtos",
                column: "NcmCodigo",
                principalTable: "Ncms",
                principalColumn: "Codigo",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Produtos_Ncms_NcmCodigo",
                table: "Produtos");

            migrationBuilder.DropTable(
                name: "Ncms");

            migrationBuilder.DropIndex(
                name: "IX_Produtos_NcmCodigo",
                table: "Produtos");

            migrationBuilder.DropColumn(
                name: "NcmCodigo",
                table: "Produtos");

            migrationBuilder.AddColumn<string>(
                name: "Ncm",
                table: "Produtos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
