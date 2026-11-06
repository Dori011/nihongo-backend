import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  // Tạo một AuthService giả (mock) để Controller có thể khởi động
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    // Nếu trong auth.controller.ts của bạn có gọi hàm nào khác của AuthService, hãy thêm tên hàm đó vào đây
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService, // Tiêm đồ giả vào thay vì lấy đồ thật
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});