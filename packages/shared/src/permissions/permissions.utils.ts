import { DataSourceInterface } from "back-end/types/datasource";
import { MetricInterface } from "back-end/types/metric";
import {
  Permission,
  UserPermissions,
  MemberRole,
} from "back-end/types/organization";
import { ProjectInterface } from "back-end/types/project";
import cloneDeep from "lodash/cloneDeep";

export function hasPermission(
  userPermissions: UserPermissions | undefined,
  permissionToCheck: Permission,
  project?: string | undefined,
  envs?: string[]
): boolean {
  const usersPermissionsToCheck =
    (project && userPermissions?.projects[project]) || userPermissions?.global;

  if (
    !usersPermissionsToCheck ||
    !usersPermissionsToCheck.permissions[permissionToCheck]
  ) {
    return false;
  }

  if (!envs || !usersPermissionsToCheck.limitAccessByEnvironment) {
    return true;
  }
  return envs.every((env) =>
    usersPermissionsToCheck.environments.includes(env)
  );
}

export function getProjectsUserCanAccess(
  currentUserPermissions: UserPermissions,
  projects: ProjectInterface[]
): ProjectInterface[] {
  // If the user's global permissions allow them to read data, set accessibleProjects to all projects
  const accessibleProjects: ProjectInterface[] = currentUserPermissions.global
    .permissions.readData
    ? projects
    : [];

  projects.forEach((project) => {
    const projectAccessibleIndex = accessibleProjects.findIndex(
      (accessibleProject) => accessibleProject.id === project.id
    );

    // Check if the user has specific permissions for this project
    const projectPermissions = currentUserPermissions.projects[project.id];

    //TODO: I don't think this logic will work in every scenario - if projectAccessibleIndex === -1, this will cause some errors, right?
    if (projectPermissions) {
      const projectReadAccess = projectPermissions.permissions.readData;
      if (projectAccessibleIndex !== -1 && !projectReadAccess) {
        // If the current project is in accessibleProjects array but the user's project-level role disallows read access, remove it
        accessibleProjects.splice(projectAccessibleIndex, 1);
      } else if (projectAccessibleIndex === -1 && projectReadAccess) {
        // if the current project is not in accessibleProjects but the user's project-level role allows read access, add it
        accessibleProjects.push(project);
      }
    }
  });

  return accessibleProjects;
}

export function getMetricsUserCanAccess(
  currentUserPermissions: UserPermissions,
  metrics: MetricInterface[]
): MetricInterface[] {
  const usersGlobalRoleHasReadPermissions =
    currentUserPermissions.global.permissions.readData;

  const accessibleMetrics: MetricInterface[] = usersGlobalRoleHasReadPermissions
    ? [...metrics]
    : [];

  const userHasProjectSpecificPermissions = !!Object.keys(
    currentUserPermissions.projects
  ).length;

  if (userHasProjectSpecificPermissions) {
    metrics.forEach((metric) => {
      const metricProjects = metric.projects || [];

      if (metricProjects.length === 0) {
        return;
      }

      if (usersGlobalRoleHasReadPermissions) {
        let userHasReadAccessToAtleastOneProject = true;
        // // global role gives them readAccess permissions, checking project-specific permissions to see if it revokes their readAccess
        metricProjects.forEach((metricProject) => {
          if (
            metricProject in currentUserPermissions.projects &&
            currentUserPermissions.projects[metricProject]?.permissions
              .readData === false
          ) {
            userHasReadAccessToAtleastOneProject = false;
          }
        });
        if (!userHasReadAccessToAtleastOneProject) {
          const metricIndex = accessibleMetrics.findIndex(
            (accessibleMetric) => accessibleMetric.id === metric.id
          );
          if (metricIndex !== -1) {
            accessibleMetrics.splice(metricIndex, 1);
          }
        }
      } else {
        // global role doesn't give them permissions, checking project-level permissions to see if it grants them readAccess
        if (
          metricProjects.some(
            (metricProject) =>
              currentUserPermissions.projects[metricProject]?.permissions
                .readData === true
          )
        ) {
          accessibleMetrics.push(metric);
        }
      }
    });
  }

  return accessibleMetrics;
}

export function getDataSourcesUserCanAccess(
  currentUserPermissions: UserPermissions,
  dataSources: DataSourceInterface[]
): DataSourceInterface[] {
  const usersGlobalRoleHasReadPermissions =
    currentUserPermissions.global.permissions.readData;

  const accessibleDataSources: DataSourceInterface[] = usersGlobalRoleHasReadPermissions
    ? cloneDeep(dataSources)
    : [];

  const userHasProjectSpecificPermissions = !!Object.keys(
    currentUserPermissions.projects
  ).length;

  if (userHasProjectSpecificPermissions) {
    dataSources.forEach((dataSource) => {
      const dataSourceProjects = dataSource.projects || [];

      if (dataSourceProjects.length === 0) {
        return;
      }

      if (usersGlobalRoleHasReadPermissions) {
        // // global role gives them readAccess permissions, checking project-specific permissions to see if it revokes their readAccess
        let userHasReadAccessToAtleastOneProject = true;
        dataSourceProjects.forEach((dataSourceProject) => {
          // I think I need to check to see if the dataSourceProject is in currentUserPermissions.projects
          if (
            dataSourceProject in currentUserPermissions.projects &&
            currentUserPermissions.projects[dataSourceProject]?.permissions
              .readData === false
          ) {
            userHasReadAccessToAtleastOneProject = false;
          }
        });
        if (!userHasReadAccessToAtleastOneProject) {
          const dataSourceIndex = accessibleDataSources.findIndex(
            (accessibleDataSource) => accessibleDataSource.id === dataSource.id
          );
          if (dataSourceIndex !== -1) {
            accessibleDataSources.splice(dataSourceIndex, 1);
          }
        }
      } else {
        // global role doesn't give them permissions, checking project-level permissions to see if it grants them readAccess
        if (
          dataSourceProjects.some(
            (dataSourceProject) =>
              currentUserPermissions.projects[dataSourceProject]?.permissions
                .readData === true
          )
        ) {
          accessibleDataSources.push(dataSource);
        }
      }
    });
  }

  return accessibleDataSources;
}

export function roleSupportsEnvLimit(role: MemberRole): boolean {
  return ["engineer", "experimenter"].includes(role);
}
