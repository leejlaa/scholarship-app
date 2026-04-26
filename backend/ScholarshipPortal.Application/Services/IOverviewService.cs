using ScholarshipPortal.Application.DTOs;

namespace ScholarshipPortal.Application.Services;

public interface IOverviewService
{
    Task<PortalOverviewDto> GetAsync(CancellationToken ct = default);
}
