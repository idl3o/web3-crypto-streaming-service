import { shallowMount, flushPromises } from '@vue/test-utils';
import LocalNetworkBridge from '@/components/network/LocalNetworkBridge.vue';
import * as LocalNetworkService from '@/services/LocalNetworkService';
import * as MarriageService from '@/services/MarriageService';

// Mock dependencies
jest.mock('@/services/LocalNetworkService');
jest.mock('@/services/MarriageService');

describe('LocalNetworkBridge.vue', () => {
  let wrapper;

  const mountComponent = (options = {}) => {
    return shallowMount(LocalNetworkBridge, {
      global: {
        provide: {
          currentTheme: 'roman-theme'
        }
      },
      ...options
    });
  };

  beforeEach(() => {
    // Set up default mock implementations
    LocalNetworkService.isConnected.mockReturnValue(false);
    LocalNetworkService.getConnectionState.mockReturnValue({
      connected: false,
      networkType: null,
      chainId: null,
      lastBlock: null,
      accounts: []
    });
    LocalNetworkService.addEventListener.mockReturnValue(jest.fn());
    
    MarriageService.getMarriageState.mockReturnValue({
      married: false
    });
    MarriageService.addEventListener.mockReturnValue(jest.fn());

    // Mount the component with default mocks
    wrapper = mountComponent();
  });

  afterEach(() => {
    wrapper.unmount();
    jest.clearAllMocks();
  });

  it('renders correctly when disconnected', () => {
    expect(wrapper.find('.connection-status').classes('disconnected')).toBe(true);
    expect(wrapper.find('.connection-status').text()).toContain('Disconnected');
    expect(wrapper.findAll('.network-details').length).toBe(0);
  });

  it('renders correctly when connected', async () => {
    // Set up mocks for connected state
    LocalNetworkService.isConnected.mockReturnValue(true);
    LocalNetworkService.getConnectionState.mockReturnValue({
      connected: true,
      networkType: 'hardhat',
      chainId: 31337,
      lastBlock: 123,
      accounts: ['0x1234']
    });

    // Re-mount with updated mocks
    wrapper = mountComponent();
    
    expect(wrapper.find('.connection-status').classes('connected')).toBe(true);
    expect(wrapper.find('.connection-status').text()).toContain('Connected to Hardhat');
    expect(wrapper.findAll('.network-details').length).toBe(1);
    expect(wrapper.find('.network-details').text()).toContain('Chain ID');
    expect(wrapper.find('.network-details').text()).toContain('31337');
  });

  it('connects to network on button click', async () => {
    // Setup successful connection response
    LocalNetworkService.connectToLocalNetwork.mockResolvedValue({
      success: true,
      chainId: 31337,
      blockNumber: 123
    });
    
    // Update connection state after successful connection
    LocalNetworkService.getConnectionState.mockReturnValue({
      connected: true,
      networkType: 'hardhat',
      chainId: 31337,
      lastBlock: 123,
      accounts: []
    });

    // Click connect button
    await wrapper.find('.connect-btn').trigger('click');
    await flushPromises();
    
    // Check if connectToLocalNetwork was called
    expect(LocalNetworkService.connectToLocalNetwork).toHaveBeenCalled();
    
    // Check if UI has been updated
    expect(wrapper.find('.connection-status').classes('connected')).toBe(true);
    expect(wrapper.findAll('.network-details').length).toBe(1);
  });

  it('marries local network when marry button is clicked', async () => {
    // Setup connected state
    LocalNetworkService.isConnected.mockReturnValue(true);
    LocalNetworkService.getConnectionState.mockReturnValue({
      connected: true,
      networkType: 'hardhat',
      chainId: 31337,
      lastBlock: 123,
      accounts: ['0x1234']
    });
    
    // Setup successful marriage
    MarriageService.marryLocalNet.mockResolvedValue({
      success: true,
      networkType: 'hardhat',
      chainId: 31337
    });

    // Re-mount with connected state
    wrapper = mountComponent();
    
    // Click marry button
    await wrapper.find('.marriage-btn').trigger('click');
    await flushPromises();
    
    // Check if marryLocalNet was called
    expect(MarriageService.marryLocalNet).toHaveBeenCalled();
    
    // Check if UI reflects marriage in progress
    expect(wrapper.vm.marriageStatus).toBe('married');
    expect(wrapper.vm.showMarriageDialog).toBe(true);
  });

  it('divorces local network when divorce button is clicked', async () => {
    // Setup connected and married state
    LocalNetworkService.isConnected.mockReturnValue(true);
    LocalNetworkService.getConnectionState.mockReturnValue({
      connected: true,
      networkType: 'hardhat',
      chainId: 31337,
      lastBlock: 123,
      accounts: ['0x1234']
    });
    
    // Re-mount with connected state
    wrapper = mountComponent();
    
    // Set married state
    await wrapper.setData({ marriageStatus: 'married', showMarriageDialog: true });
    
    // Setup successful divorce
    MarriageService.divorceLocalNet.mockResolvedValue({
      success: true
    });
    
    // Find and click the divorce button in the dialog
    const divorceBtn = wrapper.find('.divorce-btn');
    await divorceBtn.trigger('click');
    await flushPromises();
    
    // Check if divorceLocalNet was called
    expect(MarriageService.divorceLocalNet).toHaveBeenCalled();
    
    // Check if UI reflects unmarried state
    expect(wrapper.vm.marriageStatus).toBe('unmarried');
  });

  it('handles marriage event notifications', async () => {
    // Setup
    wrapper = mountComponent();
    
    // Get the marriage event handler
    const marriageEventHandler = MarriageService.addEventListener.mock.calls.find(
      call => call[0] === 'all'
    )[1];
    
    // Simulate a 'married' event
    marriageEventHandler({ type: 'married' });
    await flushPromises();
    
    // Check if component state was updated
    expect(wrapper.vm.marriageStatus).toBe('married');
    
    // Simulate a 'divorced' event
    marriageEventHandler({ type: 'divorced' });
    await flushPromises();
    
    // Check if component state was updated
    expect(wrapper.vm.marriageStatus).toBe('unmarried');
  });

  it('adds events to the event log', async () => {
    wrapper = mountComponent();
    
    // Initially no events
    expect(wrapper.vm.events).toHaveLength(0);
    
    // Add an event
    wrapper.vm.addEvent('info', 'Test message');
    
    // Check if event was added
    expect(wrapper.vm.events).toHaveLength(1);
    expect(wrapper.vm.events[0].type).toBe('info');
    expect(wrapper.vm.events[0].message).toBe('Test message');
  });
});
