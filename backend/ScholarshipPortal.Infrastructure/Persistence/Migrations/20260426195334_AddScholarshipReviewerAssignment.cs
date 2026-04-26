using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScholarshipPortal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddScholarshipReviewerAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AssignedReviewerEmail",
                table: "Scholarships",
                type: "TEXT",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssignedReviewerId",
                table: "Scholarships",
                type: "TEXT",
                maxLength: 450,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssignedReviewerName",
                table: "Scholarships",
                type: "TEXT",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedReviewerEmail",
                table: "Scholarships");

            migrationBuilder.DropColumn(
                name: "AssignedReviewerId",
                table: "Scholarships");

            migrationBuilder.DropColumn(
                name: "AssignedReviewerName",
                table: "Scholarships");
        }
    }
}
