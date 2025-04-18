
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Layers, Navigation2, TreePine, Building2, Store } from 'lucide-react';

interface MapSidebarProps {
  dataLayer: 'walkability' | 'accessibility' | 'none';
  onDataLayerChange: (layer: 'walkability' | 'accessibility' | 'none') => void;
}

const MapSidebar = ({ dataLayer, onDataLayerChange }: MapSidebarProps) => {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Map Layers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onDataLayerChange('none')}
                  isActive={dataLayer === 'none'}
                  tooltip="Base Map"
                >
                  <Navigation2 className="mr-2" />
                  <span>Base Map</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onDataLayerChange('walkability')}
                  isActive={dataLayer === 'walkability'}
                  tooltip="Walkability Score"
                >
                  <TreePine className="mr-2" />
                  <span>Walkability</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onDataLayerChange('accessibility')}
                  isActive={dataLayer === 'accessibility'}
                  tooltip="Accessibility Score"
                >
                  <Store className="mr-2" />
                  <span>Accessibility</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Property Types</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="All Properties">
                  <Building2 className="mr-2" />
                  <span>All Properties</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default MapSidebar;
