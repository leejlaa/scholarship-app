using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScholarshipPortal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AspNetUsers",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "AdminProfiles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", maxLength: 450, nullable: false),
                    Department = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    OfficeLocation = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminProfiles", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_AdminProfiles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReviewerProfiles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", maxLength: 450, nullable: false),
                    StaffNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Department = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    ExpertiseAreas = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    OfficeLocation = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Bio = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    MaxActiveReviews = table.Column<int>(type: "INTEGER", nullable: true),
                    IsAvailable = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewerProfiles", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_ReviewerProfiles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StudentProfiles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", maxLength: 450, nullable: false),
                    StudentNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Faculty = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Department = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Program = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    CurrentYear = table.Column<int>(type: "INTEGER", nullable: true),
                    Gpa = table.Column<decimal>(type: "TEXT", precision: 3, scale: 2, nullable: true),
                    DateOfBirth = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Address = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    Nationality = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    PersonalStatement = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    CvFilePath = table.Column<string>(type: "TEXT", maxLength: 260, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentProfiles", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_StudentProfiles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminProfiles");

            migrationBuilder.DropTable(
                name: "ReviewerProfiles");

            migrationBuilder.DropTable(
                name: "StudentProfiles");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AspNetUsers");
        }
    }
}
